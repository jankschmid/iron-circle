-- Fix for Stateless Monitor Client
-- Start by dropping the function to ensure clean state if signature changes slightly (though here we just change attributes)
DROP FUNCTION IF EXISTS register_new_monitor_device(text);

-- Re-create as SECURITY DEFINER with explicit search_path
CREATE OR REPLACE FUNCTION register_new_monitor_device(p_code TEXT)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.gym_monitors (pairing_code)
    VALUES (p_code)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure public access is granted
GRANT EXECUTE ON FUNCTION register_new_monitor_device(text) TO anon, authenticated, service_role;
