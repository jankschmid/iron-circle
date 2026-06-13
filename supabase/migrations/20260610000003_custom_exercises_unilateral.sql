ALTER TABLE custom_exercises 
ADD COLUMN IF NOT EXISTS is_unilateral BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tracking_type TEXT DEFAULT 'WEIGHT_REPS';

NOTIFY pgrst, 'reload schema';
