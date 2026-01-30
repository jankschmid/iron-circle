-- IRONCIRCLE FULL DATABASE FIX (2024-01-30)
-- Consolidates all recent fixes for Admin, Monitor, and Permissions.

-- 1. Schema Updates (Safe Adds)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS display_key text;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS gym_type text DEFAULT 'community' CHECK (gym_type IN ('community', 'verified_partner'));
ALTER TABLE community_members ADD COLUMN IF NOT EXISTS monitor_consent_at timestamptz DEFAULT NULL;

-- 2. Relation Fixes (400 Error Fix)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_members_user_id_fkey_profiles') THEN
        ALTER TABLE community_members 
        ADD CONSTRAINT community_members_user_id_fkey_profiles
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. RLS Permission Fixes (Admin Fix)
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

-- Note: We drop existing policies to ensure clean state if they were wrong
DROP POLICY IF EXISTS "Public Read Gyms" ON gyms;
DROP POLICY IF EXISTS "Super Admin Full Access Gyms" ON gyms;
DROP POLICY IF EXISTS "Owners Update Gyms" ON gyms;
DROP POLICY IF EXISTS "Owners Delete Gyms" ON gyms;

CREATE POLICY "Public Read Gyms" ON gyms FOR SELECT USING (true);

-- Super Admin Policy (Explicit)
CREATE POLICY "Super Admin Full Access Gyms" ON gyms 
    FOR ALL 
    USING (
        (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
    );

CREATE POLICY "Owners Update Gyms" ON gyms FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Owners Delete Gyms" ON gyms FOR DELETE USING (auth.uid() = created_by);

-- 4. Monitor Security RPC (Secure Key Check)
CREATE OR REPLACE FUNCTION verify_gym_display_key(p_gym_id uuid, p_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gyms 
    WHERE id = p_gym_id 
    AND display_key = p_key
  );
END;
$$;

GRANT EXECUTE ON FUNCTION verify_gym_display_key TO anon, authenticated, service_role;

-- 5. Monitor Data RPC (The Missing Function)
-- NUCLEAR OPTION: Drop ALL variations by name dynamically to prevent "not unique" error
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT oid::regprocedure AS name FROM pg_proc WHERE proname = 'get_live_gym_activity') LOOP 
        EXECUTE 'DROP FUNCTION ' || r.name; 
    END LOOP; 
END $$;

-- This function fetches live data BUT checks the key first!
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
        -- Return empty or assert error. Returning empty is safer for RPC.
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
        ws.started_at
    FROM workout_sessions ws
    JOIN profiles p ON ws.user_id = p.id
    JOIN community_members cm ON cm.user_id = ws.user_id
    JOIN communities c ON c.id = cm.community_id
    WHERE 
        c.gym_id = p_gym_id
        AND ws.status = 'active'
        AND (p.privacy_settings->>'gym_monitor_streaming')::boolean = true
        AND cm.monitor_consent_at IS NOT NULL
        AND ws.last_active_at > (NOW() - INTERVAL '60 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_live_gym_activity TO anon, authenticated, service_role;
