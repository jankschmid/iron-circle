
-- Enable RLS
ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workout_logs" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts (blindly)
DROP POLICY IF EXISTS "Users can insert own workouts" ON "public"."workouts";
DROP POLICY IF EXISTS "Users can update own workouts" ON "public"."workouts";
DROP POLICY IF EXISTS "Users can delete own workouts" ON "public"."workouts";
DROP POLICY IF EXISTS "Users can view own workouts" ON "public"."workouts";

-- Re-create Policies for Workouts

-- 1. VIEW: Users can view own workouts (Friend policy exists separately, usually fine to keep)
CREATE POLICY "Users can view own workouts" 
ON "public"."workouts" FOR SELECT 
USING (auth.uid() = user_id);

-- 2. INSERT: Users can insert own workouts
CREATE POLICY "Users can insert own workouts" 
ON "public"."workouts" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can update own workouts
CREATE POLICY "Users can update own workouts" 
ON "public"."workouts" FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE: Users can delete own workouts
CREATE POLICY "Users can delete own workouts" 
ON "public"."workouts" FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for Workout Logs (inheriting from workout ownership usually, or direct user_id?)
-- workout_logs does NOT have user_id column in schema! 
-- Schema: id, workout_id, exercise_id, sets, created_at.
-- So we must rely on workout_id check.

DROP POLICY IF EXISTS "Users can insert logs for own workouts" ON "public"."workout_logs";
DROP POLICY IF EXISTS "Users can update logs for own workouts" ON "public"."workout_logs";
DROP POLICY IF EXISTS "Users can delete logs for own workouts" ON "public"."workout_logs";
DROP POLICY IF EXISTS "Users can view logs for own workouts" ON "public"."workout_logs";

-- 1. VIEW Logs
CREATE POLICY "Users can view logs for own workouts" 
ON "public"."workout_logs" FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.workouts 
    WHERE workouts.id = workout_logs.workout_id 
    AND workouts.user_id = auth.uid()
));

-- 2. INSERT Logs
CREATE POLICY "Users can insert logs for own workouts" 
ON "public"."workout_logs" FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.workouts 
    WHERE workouts.id = workout_logs.workout_id 
    AND workouts.user_id = auth.uid()
));

-- 3. UPDATE Logs
CREATE POLICY "Users can update logs for own workouts" 
ON "public"."workout_logs" FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.workouts 
    WHERE workouts.id = workout_logs.workout_id 
    AND workouts.user_id = auth.uid()
));

-- 4. DELETE Logs (Existing policy "Users can delete own workout logs" might exist, but we overwrite/add)
CREATE POLICY "Users can delete logs for own workouts" 
ON "public"."workout_logs" FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.workouts 
    WHERE workouts.id = workout_logs.workout_id 
    AND workouts.user_id = auth.uid()
));
