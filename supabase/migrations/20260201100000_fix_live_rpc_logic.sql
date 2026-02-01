-- FIX GET_LIVE_GYM_ACTIVITY RPC
-- Issue: Previous version joined via communities table, which might not be linked to the session.
-- Fix: Query workout_sessions directly using gym_id.
-- Fix: Default privacy to TRUE if not set.

CREATE OR REPLACE FUNCTION get_live_gym_activity(p_display_key text, p_gym_id uuid)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    current_exercise text,
    current_set int,
    started_at timestamptz
) AS $$
DECLARE
    v_valid_key boolean;
BEGIN
    -- 1. Verify Key Internal Check
    SELECT verify_gym_display_key(p_gym_id, p_display_key) INTO v_valid_key;
    
    IF NOT v_valid_key THEN
        RETURN;
    END IF;

    -- 2. Fetch Data
    RETURN QUERY
    SELECT 
        ws.user_id,
        p.username,
        p.avatar_url,
        ws.current_exercise_name,
        ws.current_set_index,
        ws.start_time AS started_at
    FROM workout_sessions ws
    JOIN profiles p ON ws.user_id = p.id
    WHERE 
        ws.gym_id = p_gym_id
        AND ws.status = 'active'
        -- Relaxed Privacy Check: Default to TRUE (Visible) if not explicitly set to false.
        AND COALESCE((p.privacy_settings->>'gym_monitor_streaming')::boolean, true) = true
        AND ws.start_time > (NOW() - INTERVAL '12 hours'); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_live_gym_activity TO anon, authenticated, service_role;
