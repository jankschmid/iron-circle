-- Add delete policy for workout_sessions to match frontend 'deleteSession' logic
create policy "Users can delete own sessions"
    on public.workout_sessions for delete
    using (auth.uid() = user_id);
