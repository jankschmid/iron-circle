-- 1. Add Display Key to Gyms
ALTER TABLE gyms 
ADD COLUMN IF NOT EXISTS display_key text DEFAULT substr(md5(random()::text), 1, 6);

-- 2. Function to get Live Activity for a Gym Monitor
-- Security: Requires a matching display_key to prevent unauthorized scraping
CREATE OR REPLACE FUNCTION get_live_gym_activity(p_gym_id uuid, p_display_key text)
RETURNS TABLE (
    user_id uuid,
    name text,
    avatar_url text,
    started_at timestamptz,
    current_exercise text,
    set_number int,
    last_log_at timestamptz
) AS $$
BEGIN
    -- 1. Verify Display Key
    IF NOT EXISTS (SELECT 1 FROM gyms WHERE id = p_gym_id AND display_key = p_display_key) THEN
        RETURN; -- Return nothing if key is invalid (or raise error)
    END IF;

    RETURN QUERY
    SELECT 
        u.id as user_id,
        p.name,
        p.avatar_url,
        w.start_time as started_at,
        e.name as current_exercise, -- Fetch exercise name from ID (requires join or we return ID)
        COALESCE(array_length(l.sets, 1), 0) as set_number,
        l.updated_at as last_log_at -- Assuming workout_logs has updated_at or we take max timestamp from sets if JSON
    FROM workout_sessions ws
    JOIN profiles p ON ws.user_id = p.id
    JOIN community_members cm ON cm.user_id = p.id AND cm.community_id IN (SELECT id FROM communities WHERE gym_id = p_gym_id)
    LEFT JOIN workouts w ON w.user_id = p.id AND w.end_time IS NULL -- Active Workout
    -- Get Latest Log for this workout
    LEFT JOIN LATERAL (
        SELECT wl.exercise_id, wl.sets, wl.created_at as updated_at, ce.name as custom_name
        FROM workout_logs wl
        LEFT JOIN custom_exercises ce ON wl.exercise_id = ce.id -- Optional custom name
        WHERE wl.workout_id = w.id
        ORDER BY wl.created_at DESC
        LIMIT 1
    ) l ON true
    LEFT JOIN (
        -- Tiny lookup for standard exercise names could be here, or we return ID. 
        -- For simplicity in SQL, we might just return the ID or 'Exercise' if complex.
        -- Let's assume frontend maps ID or we pass ID.
        -- We'll return ID as text effectively for now if we can't join JSON file.
        -- Ideally we have an exercises table. If not (User Store has it), we return ID.
        SELECT unnest(ARRAY['uuid-1', 'uuid-2']) as id, unnest(ARRAY['Bench', 'Squat']) as name
    ) e_static ON l.exercise_id = e_static.id -- Placeholder for exercise name resolution
    WHERE 
        ws.gym_id = p_gym_id
        AND ws.status = 'active'
        -- PRIVACY GATE 1: Community Consent
        AND cm.monitor_consent_at IS NOT NULL
        -- PRIVACY GATE 2: Global Toggle (JSONB check)
        AND (p.privacy_settings->>'gym_monitor_streaming')::boolean IS TRUE
        -- TIMEOUT: Kick if inactivity > 60 mins from SESSION START or LAST LOG
        AND (
            (l.updated_at IS NOT NULL AND l.updated_at > NOW() - INTERVAL '60 minutes')
            OR 
            (l.updated_at IS NULL AND ws.start_time > NOW() - INTERVAL '60 minutes')
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Simple Leaderboard Function
CREATE OR REPLACE FUNCTION get_gym_leaderboard(p_gym_id uuid, p_display_key text)
RETURNS TABLE (
    category text,
    user_name text,
    user_avatar text,
    value text, -- Display value e.g. "120kg" or "50km"
    rank int
) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM gyms WHERE id = p_gym_id AND display_key = p_display_key) THEN
        RETURN; 
    END IF;

    -- Dummy Implementation (Replace with real stats queries)
    -- 1. Most Visits (Frequency)
    RETURN QUERY
    SELECT 
        'Most Visits' as category,
        p.name as user_name,
        p.avatar_url as user_avatar,
        count(*)::text || ' visits' as value,
        1 as rank
    FROM workout_sessions ws
    JOIN profiles p ON ws.user_id = p.id
    WHERE ws.gym_id = p_gym_id AND ws.start_time > NOW() - INTERVAL '30 days'
    AND (p.privacy_settings->>'gym_monitor_streaming')::boolean IS TRUE
    GROUP BY p.id, p.name, p.avatar_url
    ORDER BY count(*) DESC
    LIMIT 3;

    -- Add more categories (Volume, etc) via UNION ALL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
