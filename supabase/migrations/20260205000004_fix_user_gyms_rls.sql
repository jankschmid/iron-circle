-- Migration: Fix User Gyms RLS
-- Date: 2026-02-05

ALTER TABLE user_gyms ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own memberships
DROP POLICY IF EXISTS "Users can view own user_gyms" ON user_gyms;
CREATE POLICY "Users can view own user_gyms"
ON user_gyms FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own memberships
DROP POLICY IF EXISTS "Users can insert own user_gyms" ON user_gyms;
CREATE POLICY "Users can insert own user_gyms"
ON user_gyms FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own memberships (if needed)
DROP POLICY IF EXISTS "Users can update own user_gyms" ON user_gyms;
CREATE POLICY "Users can update own user_gyms"
ON user_gyms FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to leave gyms
DROP POLICY IF EXISTS "Users can delete own user_gyms" ON user_gyms;
CREATE POLICY "Users can delete own user_gyms"
ON user_gyms FOR DELETE
USING (auth.uid() = user_id);
