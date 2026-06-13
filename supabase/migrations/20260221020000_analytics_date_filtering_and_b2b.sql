-- Update existing global analytics export endpoints to accept start_date and end_date
CREATE OR REPLACE FUNCTION export_analytics_activity(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSON;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
BEGIN
    v_start := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE));
    v_end := COALESCE(p_end_date, CURRENT_TIMESTAMP);

    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            p.id as "User_ID",
            COALESCE(p.name, p.username, 'Athlete') as "Name",
            p.updated_at as "Join_Date",
            (SELECT MAX(start_time) FROM workout_sessions WHERE user_id = p.id AND start_time >= v_start AND start_time <= v_end) as "Last_Active",
            (SELECT COUNT(DISTINCT DATE(start_time)) FROM workout_sessions WHERE user_id = p.id AND start_time >= v_start AND start_time <= v_end) as "Days_Active",
            (SELECT COUNT(*) FROM workout_sessions WHERE user_id = p.id AND start_time >= v_start AND start_time <= v_end) as "Total_Workouts",
            0 as "Total_Volume_KG",
            COALESCE((SELECT AVG(duration) FROM workout_sessions WHERE user_id = p.id AND duration IS NOT NULL AND start_time >= v_start AND start_time <= v_end), 0) as "Avg_Session_Duration_Min"
        FROM profiles p
        ORDER BY "Last_Active" DESC NULLS LAST
    ) t;
    RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION export_analytics_gamification(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSON;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
BEGIN
    v_start := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE));
    v_end := COALESCE(p_end_date, CURRENT_TIMESTAMP);

    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            p.id as "User_ID",
            COALESCE(p.level, 1) as "Current_Level",
            COALESCE(p.prestige_level, 0) as "Prestige_Rank",
            COALESCE(p.lifetime_xp, 0) as "Lifetime_XP",
            (SELECT COUNT(*) FROM user_operations WHERE user_id = p.id AND is_completed = true AND completed_at >= v_start AND completed_at <= v_end) as "Daily_Ops_Completed"
        FROM profiles p
        ORDER BY "Lifetime_XP" DESC
    ) t;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN undefined_table THEN
        SELECT json_agg(row_to_json(t)) INTO result
        FROM (
            SELECT 
                p.id as "User_ID",
                COALESCE(p.level, 1) as "Current_Level",
                COALESCE(p.prestige_level, 0) as "Prestige_Rank",
                COALESCE(p.lifetime_xp, 0) as "Lifetime_XP",
                0 as "Daily_Ops_Completed"
            FROM profiles p
        ) t;
        RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION export_analytics_social(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSON;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
BEGIN
    v_start := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE));
    v_end := COALESCE(p_end_date, CURRENT_TIMESTAMP);

    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            p.id as "User_ID",
            COALESCE((
                SELECT c.name FROM community_members cm 
                JOIN communities c ON c.id = cm.community_id 
                WHERE cm.user_id = p.id LIMIT 1
            ), 'None') as "Squad_Name",
            (SELECT COUNT(*) FROM friendships WHERE (user_id = p.id OR friend_id = p.id) AND status = 'accepted' AND created_at >= v_start AND created_at <= v_end) as "Friend_Count",
            (SELECT COUNT(*) FROM messages WHERE sender_id = p.id AND created_at >= v_start AND created_at <= v_end) as "Chat_Messages_Sent"
        FROM profiles p
        ORDER BY "Friend_Count" DESC
    ) t;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN undefined_table THEN
        SELECT json_agg(row_to_json(t)) INTO result
        FROM (
            SELECT 
                p.id as "User_ID",
                'Unknown' as "Squad_Name",
                0 as "Friend_Count",
                0 as "Chat_Messages_Sent"
            FROM profiles p
        ) t;
        RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Create B2B Gym Dashboard Export endpoints
CREATE OR REPLACE FUNCTION export_gym_analytics_engagement(
    p_gym_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSON;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
BEGIN
    -- Security Check: Ensure caller owns the gym
    IF NOT EXISTS (SELECT 1 FROM gyms WHERE id = p_gym_id AND created_by = auth.uid()) THEN
        RETURN '[]'::json;
    END IF;

    v_start := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE));
    v_end := COALESCE(p_end_date, CURRENT_TIMESTAMP);

    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            p.id as "User_ID",
            COALESCE(p.name, p.username, 'Athlete') as "Name",
            (SELECT MAX(start_time) FROM workout_sessions WHERE user_id = p.id AND gym_id = p_gym_id AND start_time >= v_start AND start_time <= v_end) as "Last_Active_At_Gym",
            (SELECT COUNT(*) FROM workout_sessions WHERE user_id = p.id AND gym_id = p_gym_id AND start_time >= v_start AND start_time <= v_end) as "Workouts_At_Gym",
            CASE WHEN (SELECT MAX(start_time) FROM workout_sessions WHERE user_id = p.id AND gym_id = p_gym_id AND start_time >= v_start AND start_time <= v_end) IS NOT NULL THEN 'Active' ELSE 'Inactive' END as "Status"
        FROM profiles p
        WHERE p.home_gym_id = p_gym_id OR EXISTS (SELECT 1 FROM workout_sessions WHERE user_id = p.id AND gym_id = p_gym_id AND start_time >= v_start AND start_time <= v_end)
        ORDER BY "Workouts_At_Gym" DESC
    ) t;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION export_gym_analytics_challenges(
    p_gym_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSON;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
BEGIN
    -- Security Check: Ensure caller owns the gym
    IF NOT EXISTS (SELECT 1 FROM gyms WHERE id = p_gym_id AND created_by = auth.uid()) THEN
        RETURN '[]'::json;
    END IF;

    v_start := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE));
    v_end := COALESCE(p_end_date, CURRENT_TIMESTAMP);

    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            cgt.id as "Challenge_ID",
            cgt.title as "Challenge_Name",
            (SELECT COUNT(DISTINCT user_id) FROM workout_sessions ws WHERE ws.gym_id = p_gym_id AND ws.start_time >= v_start AND ws.start_time <= v_end) as "Active_Participants",
            (SELECT SUM(volume) FROM workout_sets wset JOIN workout_sessions ws ON ws.id = wset.session_id WHERE ws.gym_id = p_gym_id AND ws.start_time >= v_start AND ws.start_time <= v_end) as "Total_Volume_In_Challenge"
        FROM community_goal_templates cgt
        ORDER BY cgt.created_at DESC
    ) t;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;
