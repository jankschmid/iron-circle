-- Enhance Gym Events with Location and End Date
ALTER TABLE gym_events ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE gym_events ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
