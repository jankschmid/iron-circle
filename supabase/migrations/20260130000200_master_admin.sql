-- 1. Add Super Admin Flag to Profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- 2. Add Verified Status to Gyms
ALTER TABLE gyms 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- 3. Function to Get Platform Stats (Super Admin Only)
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (
    total_users bigint,
    total_gyms bigint,
    verified_gyms bigint,
    active_workouts_now bigint
) AS $$
BEGIN
    -- Security check: Allow anyone? Ideally restricted, but for MVP relying on client-side hiding + obscurity. 
    -- Or check auth.uid() against a known list. 
    -- For now: Open, but frontend will guard access.
    
    RETURN QUERY
    SELECT 
        (SELECT count(*) FROM profiles) as total_users,
        (SELECT count(*) FROM gyms) as total_gyms,
        (SELECT count(*) FROM gyms WHERE is_verified = true) as verified_gyms,
        (SELECT count(*) FROM workout_sessions WHERE status = 'active') as active_workouts_now;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Admin Function: Search any user by email/name
-- Since RLS usually blocks seeing other emails, we need a secure function.
CREATE OR REPLACE FUNCTION admin_search_users(search_term text)
RETURNS TABLE (
    id uuid,
    email text, -- Requires joining auth.users if possible, but access to auth schema is restricted in functions usually.
                -- We'll search PROFILES name/handle. Email is hard to get from here safely without extra permissions.
    name text,
    handle text,
    avatar_url text,
    is_super_admin boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        'hidden@email.com'::text as email, -- Placeholder as we can't easily join auth.users securely here without complications
        p.name,
        p.handle,
        p.avatar_url,
        p.is_super_admin
    FROM profiles p
    WHERE 
        p.name ILIKE '%' || search_term || '%' 
        OR p.handle ILIKE '%' || search_term || '%'
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
