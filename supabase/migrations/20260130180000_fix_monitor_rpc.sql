-- IRONCIRCLE MONITOR FIX REVISION 2 (2024-01-30)
-- Fixes column names in get_live_gym_activity (started_at -> start_time, remove last_active_at)

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
        ws.current_exercise_name, -- Added in previous migration
        ws.current_set_index,     -- Added in previous migration
        ws.start_time AS started_at -- Alias to match return type
    FROM workout_sessions ws
    JOIN profiles p ON ws.user_id = p.id
    JOIN community_members cm ON cm.user_id = ws.user_id
    JOIN communities c ON c.id = cm.community_id
    WHERE 
        c.gym_id = p_gym_id
        AND ws.status = 'active'
        AND (p.privacy_settings->>'gym_monitor_streaming')::boolean = true
        AND cm.monitor_consent_at IS NOT NULL
        -- Removed non-existent last_active_at check. 
        -- Assume 'active' status + start_time check is enough.
        AND ws.start_time > (NOW() - INTERVAL '12 hours'); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_live_gym_activity TO anon, authenticated, service_role;
