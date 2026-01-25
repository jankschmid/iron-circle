-- 1. Ensure RLS is enabled
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing potential policies (cleanup)
DROP POLICY IF EXISTS "Users can view own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workouts;

DROP POLICY IF EXISTS "Users can view own logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can update own logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can delete own logs" ON public.workout_logs;

-- 3. Create comprehensive policies for Workouts
CREATE POLICY "Users can manage own workouts"
ON public.workouts
FOR ALL
USING (auth.uid() = user_id);

-- 4. Create comprehensive policies for Logs
-- We allow access if the linked workout belongs to the user
CREATE POLICY "Users can manage own logs"
ON public.workout_logs
FOR ALL
USING (
    exists (
        select 1 from public.workouts
        where workouts.id = workout_logs.workout_id
        and workouts.user_id = auth.uid()
    )
);

-- Note: For INSERT on logs, the USING clause check might not work because the row doesn't exist yet?
-- Actually for INSERT, we use WITH CHECK.
-- Simplify: Just allow if the workout_id belongs to user.
-- But since we used FOR ALL, Postgres applies USING to SELECT/DELETE/UPDATE and WITH CHECK to INSERT/UPDATE.
-- For INSERT, we need to check the `workout_id` provided in the new row.
-- The EXISTS clause works fine in WITH CHECK too.

-- 5. Fix permissions for custom_exercises (just to be safe)
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own custom exercises" ON public.custom_exercises;
CREATE POLICY "Users can manage their own custom exercises"
ON public.custom_exercises
FOR ALL
USING (auth.uid() = user_id);
