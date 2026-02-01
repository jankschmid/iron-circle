-- Add duration configuration per feature
ALTER TABLE gym_tv_settings 
ADD COLUMN IF NOT EXISTS feature_durations JSONB DEFAULT '{}'::jsonb;

-- Example: { "live": 60, "news": 15, "events": 10 }
