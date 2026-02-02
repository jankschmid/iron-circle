-- Allow users to create gyms
DROP POLICY IF EXISTS "Users can create gyms" ON "public"."gyms";
CREATE POLICY "Users can create gyms" ON "public"."gyms"
FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Ensure users can update their own user_gyms (including radius)
DROP POLICY IF EXISTS "Users can update own user_gyms" ON "public"."user_gyms";
CREATE POLICY "Users can update own user_gyms" ON "public"."user_gyms"
FOR UPDATE USING (auth.uid() = user_id);

-- Ensure users can select their own user_gyms
DROP POLICY IF EXISTS "Users can view own user_gyms" ON "public"."user_gyms";
CREATE POLICY "Users can view own user_gyms" ON "public"."user_gyms"
FOR SELECT USING (auth.uid() = user_id);

-- Ensure users can delete their own user_gyms
DROP POLICY IF EXISTS "Users can delete own user_gyms" ON "public"."user_gyms";
CREATE POLICY "Users can delete own user_gyms" ON "public"."user_gyms"
FOR DELETE USING (auth.uid() = user_id);

-- Ensure users can insert their own user_gyms
DROP POLICY IF EXISTS "Users can insert own user_gyms" ON "public"."user_gyms";
CREATE POLICY "Users can insert own user_gyms" ON "public"."user_gyms"
FOR INSERT WITH CHECK (auth.uid() = user_id);
