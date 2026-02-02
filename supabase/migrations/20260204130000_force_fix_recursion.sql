-- Force fix for user_gyms recursion
-- Drop potential candidates for recursive policies
DROP POLICY IF EXISTS "Members can view gym roster" ON user_gyms;
DROP POLICY IF EXISTS "Members can view gym roster v2" ON user_gyms;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_gyms;
DROP POLICY IF EXISTS "Users can view own rows" ON user_gyms;
DROP POLICY IF EXISTS "User gyms viewable by gym members" ON user_gyms;

-- Ensure Function exists and is secure
CREATE OR REPLACE FUNCTION public.check_is_gym_member(p_gym_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_gyms 
    WHERE gym_id = p_gym_id 
    AND user_id = auth.uid()
  );
$$;

-- Create Secure Policy
CREATE POLICY "user_gyms_policy_v2" ON user_gyms
    FOR SELECT USING (
        user_id = auth.uid() 
        OR
        check_is_gym_member(gym_id)
    );

-- Allow Users to INSERT/UPDATE/DELETE their own rows (Standard)
CREATE POLICY "user_gyms_write_policy" ON user_gyms
    FOR ALL USING (
        user_id = auth.uid()
    );
