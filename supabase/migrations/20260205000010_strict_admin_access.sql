-- Migration: Strict Admin Access & Handover Logic

-- 1. Restrict gym_invites RLS
-- Remove "Super Admin" fallback from policies to prevent arbitrary access.

DROP POLICY "Admins can view invites for their gym" ON gym_invites;
DROP POLICY "Admins can create invites for their gym" ON gym_invites;
DROP POLICY "Admins can delete invites for their gym" ON gym_invites;

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

-- 2. RPC: Handover / Emergency Access
-- Only allows generating a code IF no admins exist.
CREATE OR REPLACE FUNCTION request_gym_handover(
    p_gym_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_count INT;
    new_code TEXT;
    caller_is_super BOOLEAN;
BEGIN
    -- 1. Check if caller is Super Admin
    SELECT is_super_admin INTO caller_is_super
    FROM profiles
    WHERE id = auth.uid();

    IF caller_is_super IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized: Only Platform Owners can perform this action.';
    END IF;

    -- 2. Check if admins exist
    SELECT COUNT(*) INTO admin_count
    FROM user_gyms
    WHERE gym_id = p_gym_id AND role IN ('admin', 'owner');

    IF admin_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access Denied: Gym already has an active Admin.');
    END IF;

    -- 3. Generate Code
    new_code := 'HO-' || upper(substr(md5(random()::text), 1, 8)); -- Prefix HO (Handover)

    -- 4. Create Invite (One-Time)
    INSERT INTO gym_invites (gym_id, code, role, max_uses, expires_at, created_by)
    VALUES (p_gym_id, new_code, 'admin', 1, NOW() + interval '24 hours', auth.uid());

    RETURN jsonb_build_object(
        'success', true, 
        'code', new_code,
        'message', 'Handover Code Generated. Share this with the new Gym Admin.'
    );
END;
$$;

-- 3. RPC: Get Gym Summaries for Master Admin (Avoiding massive joins on client)
CREATE OR REPLACE FUNCTION get_admin_gym_summaries()
RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    location TEXT,
    is_verified BOOLEAN,
    admin_count BIGINT,
    member_count BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        g.id,
        g.name,
        g.address,
        g.location,
        g.is_verified,
        (SELECT COUNT(*) FROM user_gyms ug WHERE ug.gym_id = g.id AND ug.role IN ('admin', 'owner')) as admin_count,
        (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id IN (SELECT id FROM communities WHERE gym_id = g.id)) as member_count,
        g.created_at
    FROM gyms g
    ORDER BY g.created_at DESC;
$$;
