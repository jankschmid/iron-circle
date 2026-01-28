
-- 1. Fix Workout Sessions Visibility
-- Allow all authenticated users to view active sessions (for Live Circle)
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON "public"."workout_sessions";

CREATE POLICY "Authenticated users can view sessions" 
ON "public"."workout_sessions" FOR SELECT 
TO authenticated 
USING (true);


-- 2. Fix Workout Logs Visibility
-- Allow viewing logs if the parent workout is public OR owned by the user
DROP POLICY IF EXISTS "Users can view logs for own workouts" ON "public"."workout_logs";

CREATE POLICY "Users can view logs for visible workouts" 
ON "public"."workout_logs" FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.workouts 
        WHERE workouts.id = workout_logs.workout_id 
        AND (workouts.user_id = auth.uid() OR workouts.visibility = 'public')
    )
);
