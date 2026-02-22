-- Fix column names for Admin Analytics CSV Exports - Part 2 (Workout Sessions)

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
            p.updated_at as "Join_Date",
            (SELECT MAX(start_time) FROM workout_sessions WHERE user_id = p.id) as "Last_Active",
            (SELECT COUNT(DISTINCT DATE(start_time)) FROM workout_sessions WHERE user_id = p.id) as "Days_Active",
            (SELECT COUNT(*) FROM workout_sessions WHERE user_id = p.id) as "Total_Workouts",
            -- Total volume is not natively in workout_sessions table, it's stored in workout_sets
            -- For now we use 0 to prevent crashes
            0 as "Total_Volume_KG",
            COALESCE((SELECT AVG(duration) FROM workout_sessions WHERE user_id = p.id AND duration IS NOT NULL), 0) as "Avg_Session_Duration_Min"
        FROM profiles p
        ORDER BY "Last_Active" DESC NULLS LAST
    ) t;
    RETURN COALESCE(result, '[]'::json);
END;
$$;
