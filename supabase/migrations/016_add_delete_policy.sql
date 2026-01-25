-- Enable Deletion of Workouts and Logs
CREATE POLICY "Users can delete own workouts"
ON public.workouts
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout logs"
ON public.workout_logs
FOR DELETE
USING (
    exists (
        select 1 from public.workouts
        where workouts.id = workout_logs.workout_id
        and workouts.user_id = auth.uid()
    )
);
