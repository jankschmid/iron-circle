-- Migration: Live Gym Activity V2
-- Date: 2026-02-05

-- We refrain from overloading and create a clean V2 function to avoid PostgREST ambiguity.
CREATE OR REPLACE FUNCTION get_live_gym_activity_v2(p_gym_id uuid)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    current_exercise text,
    current_set int,
    started_at timestamptz,
    role text,
    is_super_admin boolean
) AS $$
BEGIN
    -- This V2 is designed for the APP (Authenticated Users).
    -- It assumes RLS is handled or visibility is open for the circle.
    -- (Previous logic checked p_display_key for TV mode, we separate this concern).

    RETURN QUERY
    SELECT 
        ws.user_id,
        p.username,
        p.avatar_url,
        ws.current_exercise_name,
        ws.current_set_index,
        ws.start_time AS started_at,
        ug.role AS role,
        p.is_super_admin
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
