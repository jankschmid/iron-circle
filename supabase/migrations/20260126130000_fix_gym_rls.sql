
-- Enable RLS on gyms table explicitly
ALTER TABLE "public"."gyms" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Gyms are viewable by everyone" ON "public"."gyms";
DROP POLICY IF EXISTS "Users can create gyms" ON "public"."gyms";
DROP POLICY IF EXISTS "Creators can update own gyms" ON "public"."gyms";
DROP POLICY IF EXISTS "Creators can delete own gyms" ON "public"."gyms";

-- Re-create Policies

-- 1. SELECT: Everyone can view gyms
CREATE POLICY "Gyms are viewable by everyone" 
ON "public"."gyms" FOR SELECT 
USING (true);

-- 2. INSERT: Authenticated users can create gyms. 
-- Important: The WITH CHECK ensures they assign themselves as creator.
CREATE POLICY "Users can create gyms" 
ON "public"."gyms" FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- 3. UPDATE: Creators can update their own gyms
CREATE POLICY "Creators can update own gyms" 
ON "public"."gyms" FOR UPDATE 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- 4. DELETE: Creators can delete their own gyms
CREATE POLICY "Creators can delete own gyms" 
ON "public"."gyms" FOR DELETE 
USING (auth.uid() = created_by);
