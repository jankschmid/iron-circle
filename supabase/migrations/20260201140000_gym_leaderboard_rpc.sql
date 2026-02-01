-- Gym Leaderboard RPC
-- Returns top users for a gym based on metric

CREATE OR REPLACE FUNCTION get_gym_leaderboard(
    p_gym_id UUID,
    p_metric TEXT DEFAULT 'xp', -- 'xp', 'level', 'volume', 'workouts'
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    value BIGINT,
    rank BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to bypass complex RLS for aggregation
AS $$
BEGIN
    IF p_metric = 'xp' THEN
        RETURN QUERY
        SELECT 
            p.id as user_id,
            p.name,
            p.avatar_url,
            p.xp as value,
            RANK() OVER (ORDER BY p.xp DESC)::BIGINT as rank
        FROM profiles p
        JOIN user_gyms ug ON p.id = ug.user_id
        WHERE ug.gym_id = p_gym_id
        ORDER BY value DESC
        LIMIT 20;

    ELSIF p_metric = 'level' THEN
        RETURN QUERY
        SELECT 
            p.id as user_id,
            p.name,
            p.avatar_url,
            p.level::BIGINT as value,
            RANK() OVER (ORDER BY p.level DESC)::BIGINT as rank
        FROM profiles p
        JOIN user_gyms ug ON p.id = ug.user_id
        WHERE ug.gym_id = p_gym_id
        ORDER BY value DESC
        LIMIT 20;

    ELSIF p_metric = 'volume' THEN
        RETURN QUERY
        SELECT 
            sub.user_id,
            sub.name,
            sub.avatar_url,
            sub.total_volume as value,
            RANK() OVER (ORDER BY sub.total_volume DESC)::BIGINT as rank
        FROM (
            SELECT 
                p.id as user_id,
                p.name,
                p.avatar_url,
                COALESCE(SUM(w.volume), 0)::BIGINT as total_volume
            FROM profiles p
            JOIN workouts w ON p.id = w.user_id
            WHERE w.gym_id = p_gym_id
              AND w.end_time > (now() - (p_days || ' days')::INTERVAL)
            GROUP BY p.id, p.name, p.avatar_url
        ) sub
        ORDER BY value DESC
        LIMIT 20;
    
    ELSIF p_metric = 'workouts' THEN
         RETURN QUERY
        SELECT 
            sub.user_id,
            sub.name,
            sub.avatar_url,
            sub.count as value,
            RANK() OVER (ORDER BY sub.count DESC)::BIGINT as rank
        FROM (
            SELECT 
                p.id as user_id,
                p.name,
                p.avatar_url,
                COUNT(w.id)::BIGINT as count
            FROM profiles p
            JOIN workouts w ON p.id = w.user_id
            WHERE w.gym_id = p_gym_id
              AND w.end_time > (now() - (p_days || ' days')::INTERVAL)
            GROUP BY p.id, p.name, p.avatar_url
        ) sub
        ORDER BY value DESC
        LIMIT 20;

    END IF;
END;
$$;

-- Grant execute to anon/authenticated
GRANT EXECUTE ON FUNCTION get_gym_leaderboard(UUID, TEXT, INT) TO anon, authenticated, service_role;
