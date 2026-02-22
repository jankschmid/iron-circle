-- Fix column names for Admin Analytics CSV Exports

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
            p.updated_at as "Join_Date", -- Fallback since created_at DNE
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
            COALESCE(p.prestige_level, 0) as "Prestige_Rank", -- Fixed from prestige_rank
            COALESCE(p.lifetime_xp, 0) as "Lifetime_XP",
            (SELECT COUNT(*) FROM user_operations WHERE user_id = p.id AND is_completed = true) as "Daily_Ops_Completed"
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
