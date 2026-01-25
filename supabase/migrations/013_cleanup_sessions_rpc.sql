-- RPC to allow any user to trigger cleanup of STALE active sessions
-- This runs with SECURITY DEFINER (admin privileges) to bypass RLS, but the logic is strictly hardcoded.

CREATE OR REPLACE FUNCTION cleanup_stale_sessions(
    timeout_minutes INT DEFAULT 240 -- default 4 hours
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_rows INT;
    timeout_interval INTERVAL;
BEGIN
    timeout_interval := (timeout_minutes || ' minutes')::INTERVAL;

    WITH updated AS (
        UPDATE public.workout_sessions
        SET 
            status = 'timeout',
            end_time = (start_time + timeout_interval),
            duration = (EXTRACT(EPOCH FROM timeout_interval)::INT),
            auto_closed = true
        WHERE 
            status = 'active' 
            AND start_time < (NOW() - timeout_interval)
        RETURNING id
    )
    SELECT COUNT(*) INTO affected_rows FROM updated;

    RETURN affected_rows;
END;
$$;
