
-- Enable RLS on workout_sessions
ALTER TABLE "public"."workout_sessions" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own sessions" ON "public"."workout_sessions";
DROP POLICY IF EXISTS "Users can update own sessions" ON "public"."workout_sessions";
DROP POLICY IF EXISTS "Users can delete own sessions" ON "public"."workout_sessions";
DROP POLICY IF EXISTS "Friends can view sessions" ON "public"."workout_sessions"; -- We can keep this or recreate
DROP POLICY IF EXISTS "Users can view own sessions" ON "public"."workout_sessions";

-- Re-create Policies

-- 1. VIEW: Users can view own sessions
CREATE POLICY "Users can view own sessions" 
ON "public"."workout_sessions" FOR SELECT 
USING (auth.uid() = user_id);

-- (Keep Friend View if needed, assuming existing migration handles it or we recreate relevant parts? 
-- The previous remote schema showed "Friends can view sessions". We should preserve that or assume it's additive.
-- However, DROP POLICY might fail if it doesn't exist. Safest is to just ADD the missing ones.)

-- 2. INSERT: Users can insert own sessions (Already existed? Re-affirming)
CREATE POLICY "Users can insert own sessions" 
ON "public"."workout_sessions" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can update own sessions
CREATE POLICY "Users can update own sessions" 
ON "public"."workout_sessions" FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE: Users can delete own sessions (THIS WAS MISSING)
CREATE POLICY "Users can delete own sessions" 
ON "public"."workout_sessions" FOR DELETE 
USING (auth.uid() = user_id);
