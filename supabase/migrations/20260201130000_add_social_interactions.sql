-- Workout Likes Table
CREATE TABLE IF NOT EXISTS workout_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workout_id, user_id)
);

-- Enable RLS
ALTER TABLE workout_likes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see likes" ON workout_likes FOR SELECT USING (true);

CREATE POLICY "Users can like workouts" ON workout_likes 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own" ON workout_likes 
    FOR DELETE USING (auth.uid() = user_id);

-- Add index/trigger to count likes on workouts? 
-- Or just count them on read. Counting on read is safer for now.
