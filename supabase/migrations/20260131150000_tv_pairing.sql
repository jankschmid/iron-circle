-- Create gym_monitors table for TV pairing
CREATE TABLE IF NOT EXISTS public.gym_monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pairing_code TEXT NOT NULL UNIQUE,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('pending', 'active')) DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE public.gym_monitors ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can create a monitor (when opening /tv page)
CREATE POLICY "Anyone can create monitor" ON public.gym_monitors
    FOR INSERT WITH CHECK (true);

-- Anyone can read monitor status (to poll for activation)
CREATE POLICY "Anyone can read monitor" ON public.gym_monitors
    FOR SELECT USING (true);
    
-- Only Gym Admins can update their own monitors (via RPC usually, but standard policy for safety)
CREATE POLICY "Admins can update monitors" ON public.gym_monitors
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.gyms
            WHERE id = gym_monitors.gym_id
            AND created_by = auth.uid()
        )
    );

-- RPC to register a new monitor (client-side generation fallback)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to link a monitor to a gym (Admin Action)
CREATE OR REPLACE FUNCTION link_gym_monitor(p_code TEXT, p_gym_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_gym_exists BOOLEAN;
BEGIN
    -- Verify user owns the gym (security)
    SELECT EXISTS (
        SELECT 1 FROM public.gyms 
        WHERE id = p_gym_id 
        AND (created_by = auth.uid() OR auth.jwt() ->> 'is_service_role' = 'true')
    ) INTO v_gym_exists;
    
    IF NOT v_gym_exists THEN
        RAISE EXCEPTION 'Access Denied: You do not own this gym.';
    END IF;

    UPDATE public.gym_monitors
    SET gym_id = p_gym_id,
        status = 'active',
        updated_at = NOW()
    WHERE pairing_code = p_code;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT ALL ON public.gym_monitors TO anon, authenticated, service_role;
