-- RPC: Get Group Leaderboard
-- Efficiently calculates rankings for a community based on metric

CREATE OR REPLACE FUNCTION get_group_leaderboard(
    p_community_id UUID, 
    p_metric TEXT DEFAULT 'VOLUME', -- 'VOLUME', 'WORKOUTS', 'DISTANCE'
    p_days INT DEFAULT 7
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    value BIGINT,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH member_stats AS (
        SELECT 
            w.user_id,
            COALESCE(SUM(CASE 
                WHEN p_metric = 'VOLUME' THEN w.volume 
                WHEN p_metric = 'DISTANCE' THEN w.duration -- Using duration as proxy for cardio/distance if distance not tracked
                ELSE 1 -- WORKOUTS (Count)
            END), 0) as score
        FROM workouts w
        JOIN community_members cm ON cm.user_id = w.user_id
        WHERE cm.community_id = p_community_id
        AND w.end_time >= NOW() - (p_days || ' days')::INTERVAL
        AND w.status = 'completed'
        GROUP BY w.user_id
    ),
    all_members AS (
        SELECT 
            cm.user_id,
            p.username,
            p.avatar_url,
            COALESCE(ms.score, 0) as score
        FROM community_members cm
        JOIN profiles p ON p.id = cm.user_id
        LEFT JOIN member_stats ms ON ms.user_id = cm.user_id
        WHERE cm.community_id = p_community_id
    )
    SELECT 
        am.user_id,
        am.username,
        am.avatar_url,
        CAST(am.score AS BIGINT) as value,
        RANK() OVER (ORDER BY am.score DESC) as rank
    FROM all_members am
    ORDER BY rank ASC, am.username ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
