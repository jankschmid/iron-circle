-- Add plan_day_id to workouts and workout_sessions
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS plan_day_id UUID;

ALTER TABLE workout_sessions 
ADD COLUMN IF NOT EXISTS plan_day_id UUID;

-- Streaks Table
CREATE TABLE IF NOT EXISTS streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    last_log_date TIMESTAMPTZ,
    freezes_remaining INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Streaks
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streaks"
ON streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
ON streaks FOR ALL
USING (auth.uid() = user_id);

-- Function to handle streak updates (optional, or handle in app logic)
-- For now, we'll handle calculation in app/JS logic for flexibility.
