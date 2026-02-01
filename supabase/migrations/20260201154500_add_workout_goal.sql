-- Add workout_goal column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS workout_goal INT DEFAULT 150;
