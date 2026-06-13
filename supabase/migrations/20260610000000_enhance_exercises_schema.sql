-- Add advanced tracking and muscle mapping fields to exercises
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS tracking_type TEXT DEFAULT 'WEIGHT_REPS' CHECK (tracking_type IN ('WEIGHT_REPS', 'TIME_DISTANCE', 'TIME_ONLY', 'REPS_ONLY')),
ADD COLUMN IF NOT EXISTS primary_muscles TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_unilateral BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Refresh schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
