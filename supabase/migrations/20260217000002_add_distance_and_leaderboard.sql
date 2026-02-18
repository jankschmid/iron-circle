-- 1. Add Distance column to workouts
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workouts' AND column_name = 'distance') THEN 
        ALTER TABLE workouts ADD COLUMN distance REAL DEFAULT 0; 
    END IF; 
END $$;

-- 2. Leaderboard Function
CREATE OR REPLACE FUNCTION get_group_leaderboard(p_community_id UUID, p_metric TEXT DEFAULT 'VOLUME')
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    rank BIGINT,
    value REAL
) AS $$
BEGIN
    RETURN QUERY
    WITH weekly_stats AS (
        SELECT 
            w.user_id,
           SUM(
                CASE 
                    WHEN p_metric = 'VOLUME' THEN w.volume 
                    WHEN p_metric = 'WORKOUTS' THEN 1
                    WHEN p_metric = 'DISTANCE' THEN w.distance
                    ELSE 0 
                END
            ) as metric_value
        FROM workouts w
        JOIN community_members cm ON cm.community_id = p_community_id AND cm.user_id = w.user_id
        JOIN profiles p ON p.id = w.user_id
        WHERE w.start_time > NOW() - INTERVAL '7 days'
        AND w.end_time IS NOT NULL
        GROUP BY w.user_id
    )
    SELECT 
        ws.user_id,
        p.username,
        p.avatar_url,
        RANK() OVER (ORDER BY ws.metric_value DESC)::BIGINT as rank,
        ws.metric_value::REAL as value
    FROM weekly_stats ws
    JOIN profiles p ON p.id = ws.user_id
    ORDER BY rank ASC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
