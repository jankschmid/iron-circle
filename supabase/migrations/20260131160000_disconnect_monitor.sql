-- RPC to disconnect a monitor (Admin Action)
CREATE OR REPLACE FUNCTION disconnect_gym_monitor(p_monitor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_gym_id UUID;
    v_gym_exists BOOLEAN;
BEGIN
    -- Get the gym_id of the monitor to verify ownership
    SELECT gym_id INTO v_gym_id
    FROM public.gym_monitors
    WHERE id = p_monitor_id;

    IF v_gym_id IS NULL THEN
        RAISE EXCEPTION 'Monitor not found or already disconnected.';
    END IF;

    -- Verify user owns the gym associated with this monitor
    SELECT EXISTS (
        SELECT 1 FROM public.gyms 
        WHERE id = v_gym_id 
        AND (created_by = auth.uid() OR auth.jwt() ->> 'is_service_role' = 'true')
    ) INTO v_gym_exists;
    
    IF NOT v_gym_exists THEN
        RAISE EXCEPTION 'Access Denied: You do not own this gym.';
    END IF;

    -- Reset the monitor connection
    UPDATE public.gym_monitors
    SET gym_id = NULL,
        status = 'pending',
        updated_at = NOW()
    WHERE id = p_monitor_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
