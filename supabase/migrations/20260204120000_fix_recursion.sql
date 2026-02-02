-- Fix for infinite recursion in user_gyms RLS policy
-- Introduced by the "Members can view gym roster" policy in team_management migration.

-- 1. Create a Helper Function to check membership securely (Bypassing RLS)
-- This function runs as the owner (postgres), so it does not trigger RLS on user_gyms again.
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

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Members can view gym roster" ON user_gyms;

-- 3. Re-create the policy using the secure function
CREATE POLICY "Members can view gym roster" ON user_gyms
    FOR SELECT USING (
        -- Users can always see their own row (optimization)
        user_id = auth.uid() 
        OR
        -- OR they can see rows of gyms they are members of
        check_is_gym_member(gym_id)
    );
