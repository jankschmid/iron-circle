-- IRONCIRCLE MONITOR FIX (2024-01-30)
-- Adds missing columns for live tracking

ALTER TABLE public.workout_sessions 
ADD COLUMN IF NOT EXISTS current_exercise_name text,
ADD COLUMN IF NOT EXISTS current_set_index integer;

-- Grant access to these new columns just in case RLS/Grants need refresh (usually automatic for table owners)
GRANT SELECT, INSERT, UPDATE ON public.workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.workout_sessions TO anon; -- For monitor if needed (via RPC)
