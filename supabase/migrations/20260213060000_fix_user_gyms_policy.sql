-- Fix user_gyms RLS to allow viewing staff and other members
-- Date: 2026-02-13

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own user_gyms" ON "public"."user_gyms";

-- Drop the new policy if it exists (to allow re-running this script)
DROP POLICY IF EXISTS "Authenticated users can view all user_gyms" ON "public"."user_gyms";

-- Allow authenticated users to view all gym memberships
-- (Needed for chat to identify staff and for social features)
CREATE POLICY "Authenticated users can view all user_gyms"
ON "public"."user_gyms"
FOR SELECT
TO authenticated
USING (true);
