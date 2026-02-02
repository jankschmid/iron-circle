-- Migration: Add Roles to RPCs for Badges
-- Date: 2026-02-05

-- 1. Update get_live_gym_activity to return role
DROP FUNCTION IF EXISTS get_live_gym_activity(text, uuid);
DROP FUNCTION IF EXISTS get_live_gym_activity(uuid); -- Drop potential overload

CREATE OR REPLACE FUNCTION get_live_gym_activity(p_gym_id uuid, p_display_key text DEFAULT NULL)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    current_exercise text,
    current_set int,
    started_at timestamptz,
    role text
) AS $$
DECLARE
    v_valid_key boolean;
BEGIN
    -- 1. Authentication / Authorization Check
    IF p_display_key IS NOT NULL THEN
        -- Monitor Mode: Verify Key
        SELECT verify_gym_display_key(p_gym_id, p_display_key) INTO v_valid_key;
        IF NOT v_valid_key THEN
            RETURN;
        END IF;
    ELSE
        -- App Mode: Verify User is Authenticated (RLS will handle the rest via queries, but good to check)
        -- Ideally check if user is member of gym, but for public gyms visibility might be open.
        -- We will proceed and let the JOINs determine visibility.
    END IF;

    -- 2. Fetch Data
    RETURN QUERY
    SELECT 
        ws.user_id,
        p.username,
        p.avatar_url,
        ws.current_exercise_name,
        ws.current_set_index,
        ws.start_time AS started_at,
        ug.role AS role
    FROM workout_sessions ws
    JOIN profiles p ON ws.user_id = p.id
    LEFT JOIN user_gyms ug ON ug.user_id = ws.user_id AND ug.gym_id = ws.gym_id
    WHERE 
        ws.gym_id = p_gym_id
        AND ws.status = 'active'
        AND COALESCE((p.privacy_settings->>'gym_monitor_streaming')::boolean, true) = true
        AND ws.start_time > (NOW() - INTERVAL '12 hours'); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update get_gym_leaderboard to return role
DROP FUNCTION IF EXISTS get_gym_leaderboard(uuid, text, int);

CREATE OR REPLACE FUNCTION get_gym_leaderboard(
    p_gym_id UUID,
    p_metric TEXT DEFAULT 'xp',
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    value BIGINT,
    rank BIGINT,
    role TEXT -- NEW
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_metric = 'xp' THEN
        RETURN QUERY
        SELECT 
            p.id as user_id,
            p.name,
            p.avatar_url,
            p.xp as value,
            RANK() OVER (ORDER BY p.xp DESC)::BIGINT as rank,
            ug.role
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
            RANK() OVER (ORDER BY p.level DESC)::BIGINT as rank,
            ug.role
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
            RANK() OVER (ORDER BY sub.total_volume DESC)::BIGINT as rank,
            sub.role
        FROM (
            SELECT 
                p.id as user_id,
                p.name,
                p.avatar_url,
                COALESCE(SUM(w.volume), 0)::BIGINT as total_volume,
                MAX(ug.role) as role -- aggregation hack, role is constant for user+gym
            FROM profiles p
            JOIN user_gyms ug ON p.id = ug.user_id -- Explicit join for role
            JOIN workouts w ON p.id = w.user_id
            WHERE w.gym_id = p_gym_id
              AND ug.gym_id = p_gym_id -- Ensure role comes from THIS gym
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
            RANK() OVER (ORDER BY sub.count DESC)::BIGINT as rank,
            sub.role
        FROM (
            SELECT 
                p.id as user_id,
                p.name,
                p.avatar_url,
                COUNT(w.id)::BIGINT as count,
                MAX(ug.role) as role
            FROM profiles p
            JOIN user_gyms ug ON p.id = ug.user_id
            JOIN workouts w ON p.id = w.user_id
            WHERE w.gym_id = p_gym_id
              AND ug.gym_id = p_gym_id
              AND w.end_time > (now() - (p_days || ' days')::INTERVAL)
            GROUP BY p.id, p.name, p.avatar_url
        ) sub
        ORDER BY value DESC
        LIMIT 20;

    END IF;
END;
$$;
