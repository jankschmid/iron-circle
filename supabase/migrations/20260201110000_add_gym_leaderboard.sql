-- Add gym_id to workouts
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);

CREATE INDEX IF NOT EXISTS idx_workouts_gym_id ON workouts(gym_id);

-- Create Leaderboard RPC
CREATE OR REPLACE FUNCTION get_gym_leaderboard(
    p_gym_id UUID,
    p_period TEXT DEFAULT 'month', -- 'month', 'week', 'all'
    p_metric TEXT DEFAULT 'volume', -- 'volume', 'visits'
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    value BIGINT,
    rank BIGINT
) AS $$
DECLARE
    v_start_date TIMESTAMP;
BEGIN
    -- Determine time range
    IF p_period = 'week' THEN
        v_start_date := (now() - interval '7 days');
    ELSIF p_period = 'month' THEN
        v_start_date := (now() - interval '30 days');
    ELSE
        v_start_date := '1970-01-01'::TIMESTAMP;
    END IF;

    RETURN QUERY
    WITH user_stats AS (
        SELECT 
            w.user_id,
            SUM(w.volume) as total_volume,
            COUNT(w.id) as total_visits
        FROM workouts w
        WHERE w.gym_id = p_gym_id
          AND w.end_time >= v_start_date
          AND w.visibility = 'public'
        GROUP BY w.user_id
    )
    SELECT 
        s.user_id,
        p.username,
        p.avatar_url,
        CASE 
            WHEN p_metric = 'volume' THEN s.total_volume
            ELSE s.total_visits
        END as value,
        RANK() OVER (ORDER BY (CASE WHEN p_metric = 'volume' THEN s.total_volume ELSE s.total_visits END) DESC) as rank
    FROM user_stats s
    JOIN profiles p ON s.user_id = p.id
    ORDER BY rank ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
