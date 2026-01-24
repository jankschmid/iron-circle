-- Allow 'timeout' status for auto-expired sessions
ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_status_check;
ALTER TABLE public.workout_sessions ADD CONSTRAINT workout_sessions_status_check CHECK (status IN ('active', 'completed', 'timeout'));
