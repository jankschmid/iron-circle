-- Add 'auto_closed' flag for Janitor function
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS auto_closed boolean DEFAULT false;
