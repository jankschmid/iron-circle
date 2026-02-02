-- Migration: Team Management & Staff Roles permissions

-- 1. Ensure user_gyms has the correct role column (if not already from previous migration)
-- Doing this idempotently just in case
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_gyms' AND column_name = 'role') THEN
        ALTER TABLE user_gyms ADD COLUMN role TEXT DEFAULT 'member';
    END IF;
END $$;

-- 2. Function to find a member in a specific gym by Exact Email match
-- Returns the profile if the user with that email is a member of the gym.
-- SECURITY DEFINER needed to query auth.users by email.
CREATE OR REPLACE FUNCTION find_gym_member_by_email(
    p_gym_id UUID,
    p_email TEXT
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    handle TEXT,
    avatar TEXT,
    member_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_uid UUID;
    caller_role TEXT;
BEGIN
    -- Check permissions: Caller must be owner or admin of the gym
    SELECT role INTO caller_role
    FROM user_gyms
    WHERE user_id = auth.uid() AND gym_id = p_gym_id;

    IF caller_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: You must be an admin or owner to search for staff.';
    END IF;

    -- Lookup User ID from Email (auth.users)
    SELECT u.id INTO target_uid
    FROM auth.users u
    WHERE lower(u.email) = lower(p_email);

    IF target_uid IS NULL THEN
        RETURN; -- No user found
    END IF;

    -- Check if this user is a member of the gym and return profile
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.handle,
        p.avatar, -- assuming avatar column exists in profiles or we select avatar_url
        ug.role AS member_role
    FROM profiles p
    JOIN user_gyms ug ON ug.user_id = p.id
    WHERE p.id = target_uid AND ug.gym_id = p_gym_id;
END;
$$;


-- 3. Function to update a member's role
CREATE OR REPLACE FUNCTION update_gym_member_role(
    p_gym_id UUID,
    p_user_id UUID,
    p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
    target_role TEXT;
BEGIN
    -- Permission Check
    SELECT role INTO caller_role
    FROM user_gyms
    WHERE user_id = auth.uid() AND gym_id = p_gym_id;

    IF caller_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Validate new role
    IF p_new_role NOT IN ('member', 'trainer', 'admin') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;

    -- Prevent modifying Owner's role if not Owner? 
    -- (For MVP we trust admins don't degrade owners or we add check)
    -- Simple check: Cannot change role OF an owner unless you are the owner.
    SELECT role INTO target_role
    FROM user_gyms WHERE user_id = p_user_id AND gym_id = p_gym_id;
    
    IF target_role = 'owner' THEN
        RAISE EXCEPTION 'Cannot modify Owner role.';
    END IF;

    -- Update
    UPDATE user_gyms
    SET role = p_new_role
    WHERE user_id = p_user_id AND gym_id = p_gym_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Member not found');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Secure function to get all staff (for the list view)
-- Users can see staff, but maybe we want a dedicated endpoint?
-- Actually, a simple SELECT * FROM user_gyms WHERE role IN ('admin', 'trainer') AND gym_id = X
-- with RLS is sufficient IF we expose roles via RLS.
-- Let's update RLS for user_gyms to allow reading roles.
-- Assuming user_gyms is viewable by members of the gym.

-- Policy check (idempotent-ish):
DROP POLICY IF EXISTS "Members can view gym roster" ON user_gyms;
CREATE POLICY "Members can view gym roster" ON user_gyms
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM user_gyms WHERE gym_id = user_gyms.gym_id
        )
    );
