-- Migration: Admin Analytics CSV Exports
-- Implements 3 RPCs to fetch structured JSON data for the Master Admin Dashboard.

-- 1. Activity & Retention Export (The 'Grind' Report)
CREATE OR REPLACE FUNCTION export_analytics_activity()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            p.id as "User_ID",
            COALESCE(p.name, p.username, 'Athlete') as "Name",
            p.created_at as "Join_Date",
            (SELECT MAX(start_time) FROM workouts WHERE user_id = p.id) as "Last_Active",
            (SELECT COUNT(DISTINCT DATE(start_time)) FROM workouts WHERE user_id = p.id) as "Days_Active",
            (SELECT COUNT(*) FROM workouts WHERE user_id = p.id) as "Total_Workouts",
            COALESCE((SELECT SUM(volume) FROM workouts WHERE user_id = p.id), 0) as "Total_Volume_KG",
            COALESCE((SELECT AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60)::INT FROM workouts WHERE user_id = p.id AND end_time IS NOT NULL), 0) as "Avg_Session_Duration_Min"
        FROM profiles p
        ORDER BY "Last_Active" DESC NULLS LAST
    ) t;
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 2. Gamification Export (The 'Hook' Report)
CREATE OR REPLACE FUNCTION export_analytics_gamification()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            p.id as "User_ID",
            COALESCE(p.level, 1) as "Current_Level",
            COALESCE(p.prestige_rank, 0) as "Prestige_Rank",
            COALESCE(p.lifetime_xp, 0) as "Lifetime_XP",
            (SELECT COUNT(*) FROM operations WHERE user_id = p.id AND status = 'completed') as "Daily_Ops_Completed"
            -- Team_Goals_Contributed removed to avoid missing table dependency
        FROM profiles p
        ORDER BY "Lifetime_XP" DESC
    ) t;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN undefined_table THEN
        -- Fallback if 'operations' table differs
        SELECT json_agg(row_to_json(t)) INTO result
        FROM (
            SELECT 
                p.id as "User_ID",
                COALESCE(p.level, 1) as "Current_Level",
                COALESCE(p.prestige_rank, 0) as "Prestige_Rank",
                COALESCE(p.lifetime_xp, 0) as "Lifetime_XP",
                0 as "Daily_Ops_Completed"
            FROM profiles p
        ) t;
        RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 3. Social & Virality Export (The 'Network' Report)
CREATE OR REPLACE FUNCTION export_analytics_social()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            p.id as "User_ID",
            COALESCE((
                SELECT c.name FROM community_members cm 
                JOIN communities c ON c.id = cm.community_id 
                WHERE cm.user_id = p.id LIMIT 1
            ), 'None') as "Squad_Name",
            (SELECT COUNT(*) FROM friendships WHERE (user_id = p.id OR friend_id = p.id) AND status = 'accepted') as "Friend_Count",
            (SELECT COUNT(*) FROM messages WHERE sender_id = p.id) as "Chat_Messages_Sent"
        FROM profiles p
        ORDER BY "Friend_Count" DESC
    ) t;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN undefined_table THEN
        -- Fallback if friendships or messages missing
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
