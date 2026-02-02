-- Migration: Secure Gym Invitations

-- 1. Create Invitations Table
CREATE TABLE IF NOT EXISTS gym_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('trainer', 'admin')),
    max_uses INT, -- NULL means unlimited
    used_count INT DEFAULT 0,
    expires_at TIMESTAMPTZ, -- NULL means no expiry
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE gym_invites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view invites for their gym"
ON gym_invites FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_gyms 
        WHERE user_id = auth.uid() 
        AND gym_id = gym_invites.gym_id 
        AND role IN ('admin', 'owner')
    )
    OR
    EXISTS ( -- Super Admin fallback
         SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true
    )
);

CREATE POLICY "Admins can create invites for their gym"
ON gym_invites FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_gyms 
        WHERE user_id = auth.uid() 
        AND gym_id = gym_invites.gym_id 
        AND role IN ('admin', 'owner')
    )
    OR
    EXISTS ( -- Super Admin fallback
         SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true
    )
);

CREATE POLICY "Admins can delete invites for their gym"
ON gym_invites FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_gyms 
        WHERE user_id = auth.uid() 
        AND gym_id = gym_invites.gym_id 
        AND role IN ('admin', 'owner')
    )
);

-- 2. Update Join RPC
CREATE OR REPLACE FUNCTION join_gym_with_code(
    p_code TEXT
)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invite_record RECORD;
    target_gym_id UUID;
    assigned_role TEXT;
    gym_name TEXT;
    existing_role TEXT;
BEGIN
    -- Trim and verify
    p_code := trim(upper(p_code));

    -- Look up valid invite
    SELECT i.*, g.name as gym_name
    INTO invite_record
    FROM gym_invites i
    JOIN gyms g ON g.id = i.gym_id
    WHERE i.code = p_code;

    -- Checks
    IF invite_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Code');
    END IF;

    IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code Expired');
    END IF;

    IF invite_record.max_uses IS NOT NULL AND invite_record.used_count >= invite_record.max_uses THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code fully used');
    END IF;

    target_gym_id := invite_record.gym_id;
    assigned_role := invite_record.role;
    gym_name := invite_record.gym_name;

    -- Check if user already in gym
    SELECT role INTO existing_role
    FROM user_gyms 
    WHERE user_id = auth.uid() AND gym_id = target_gym_id;

    IF existing_role IS NOT NULL THEN
        -- Update Role if promoting? (Simple logic: just update)
        UPDATE user_gyms 
        SET role = assigned_role 
        WHERE user_id = auth.uid() AND gym_id = target_gym_id;
        
        UPDATE community_members
        SET role = assigned_role 
        WHERE user_id = auth.uid() 
          AND community_id IN (SELECT id FROM communities WHERE gym_id = target_gym_id);
    ELSE
        -- Insert new membership
        INSERT INTO user_gyms (user_id, gym_id, role, label, is_default)
        VALUES (auth.uid(), target_gym_id, assigned_role, gym_name, true);
        
        -- Join community
        INSERT INTO community_members (community_id, user_id, role)
        SELECT id, auth.uid(), assigned_role
        FROM communities WHERE gym_id = target_gym_id;
    END IF;

    -- Increment Usage
    UPDATE gym_invites
    SET used_count = used_count + 1
    WHERE id = invite_record.id;

    RETURN jsonb_build_object(
        'success', true, 
        'gym_id', target_gym_id, 
        'role', assigned_role, 
        'gym_name', gym_name
    );
END;
$$;

-- 3. Deprecate columns (Just Drop them to keep it clean, data loss is acceptable as per user request to change system)
ALTER TABLE gyms DROP COLUMN IF EXISTS access_code_trainer;
ALTER TABLE gyms DROP COLUMN IF EXISTS access_code_admin;
