-- Add goal column to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS goal TEXT DEFAULT 'Muscle';

-- Comment on column
COMMENT ON COLUMN profiles.goal IS 'Main training goal: Muscle, Strength, Endurance, Weight Loss';
