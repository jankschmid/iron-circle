-- Migration: Fix Invite Idempotency
-- Replaces join_gym_with_code to check membership BEFORE checking usage limits.

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

    -- Set variables
    target_gym_id := invite_record.gym_id;
    assigned_role := invite_record.role;
    gym_name := invite_record.gym_name;

    -- IDEMPOTENCY CHECK (Moved Before Usage Limit)
    -- Check if user already in gym
    SELECT role INTO existing_role
    FROM user_gyms 
    WHERE user_id = auth.uid() AND gym_id = target_gym_id;

    IF existing_role IS NOT NULL THEN
        -- User IS already in gym!
        -- Determine if we need to update anything (e.g. role promotion)
        -- But for idempotency (retrying same code), we generally just return success.
        
        -- Optional: If they are 'member' and code is for 'trainer', upgrade them?
        IF assigned_role = 'trainer' AND existing_role = 'member' THEN
             UPDATE user_gyms SET role = 'trainer' WHERE user_id = auth.uid() AND gym_id = target_gym_id;
             UPDATE community_members SET role = 'trainer' WHERE user_id = auth.uid() AND community_id IN (SELECT id FROM communities WHERE gym_id = target_gym_id);
        END IF;

        -- Return Success immediately WITHOUT checking/incrementing usage
        RETURN jsonb_build_object(
            'success', true, 
            'gym_id', target_gym_id, 
            'role', assigned_role, 
            'gym_name', gym_name,
            'message', 'Already a member'
        );
    END IF;

    -- USAGE LIMIT CHECK (Now after membership check)
    IF invite_record.max_uses IS NOT NULL AND invite_record.used_count >= invite_record.max_uses THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code fully used');
    END IF;

    -- Insert new membership
    INSERT INTO user_gyms (user_id, gym_id, role, label, is_default)
    VALUES (auth.uid(), target_gym_id, assigned_role, gym_name, true);
    
    -- Join community
    INSERT INTO community_members (community_id, user_id, role)
    SELECT id, auth.uid(), assigned_role
    FROM communities WHERE gym_id = target_gym_id;

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
