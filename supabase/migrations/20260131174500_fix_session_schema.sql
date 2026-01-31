-- Fix Start Session Error
-- Add is_private column to workout_sessions table
ALTER TABLE public.workout_sessions
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Grant access (standard reset)
GRANT ALL ON public.workout_sessions TO anon, authenticated, service_role;
