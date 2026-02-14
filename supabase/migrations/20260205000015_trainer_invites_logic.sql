
-- 1. Add trainer_code to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trainer_code TEXT UNIQUE;

-- 2. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_trainer_code ON profiles(trainer_code);
-- Use text_pattern_ops for LIKE searches (Prefix only, but robust)
CREATE INDEX IF NOT EXISTS idx_profiles_username_search ON profiles(username text_pattern_ops) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_name_search ON profiles(name text_pattern_ops) WHERE name IS NOT NULL;

-- 3. Function to Generate Trainer Code (User specific)
-- Format: TR-[RANDOM_6_CHARS]
CREATE OR REPLACE FUNCTION generate_trainer_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No I, O, 1, 0 to avoid confusion
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN 'TR-' || result;
END;
$$;

-- 4. RPC: Get or Create My Trainer Code
CREATE OR REPLACE FUNCTION get_my_trainer_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_code TEXT;
    new_code TEXT;
BEGIN
    -- Check existing
    SELECT trainer_code INTO current_code FROM profiles WHERE id = auth.uid();
    
    IF current_code IS NOT NULL THEN
        RETURN current_code;
    END IF;

    -- Generate a unique one
    LOOP
        new_code := generate_trainer_code();
        BEGIN
            UPDATE profiles SET trainer_code = new_code WHERE id = auth.uid();
            RETURN new_code;
        EXCEPTION WHEN unique_violation THEN
            -- Retry loop
        END;
    END LOOP;
END;
$$;

-- 5. RPC: Secure Profile Search (Privacy Focused)
-- Only returns basic info. No emails. No private details.
CREATE OR REPLACE FUNCTION search_profiles_secure(
    p_query TEXT
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    name TEXT,
    avatar_url TEXT,
    is_client BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    p_query := trim(p_query);
    
    IF length(p_query) < 3 THEN
        RETURN; -- Too short
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.name,
        p.avatar_url,
        EXISTS (
            SELECT 1 FROM trainer_relationships tr 
            WHERE tr.trainer_id = auth.uid() 
            AND tr.client_id = p.id 
            AND tr.status IN ('active', 'pending')
        ) as is_client
    FROM profiles p
    WHERE 
        (p.username ILIKE '%' || p_query || '%' OR p.name ILIKE '%' || p_query || '%')
        AND p.id != auth.uid() -- Don't find self
        -- PRIVACY: Only show 'public' profiles OR profiles that are already connected?
        -- User assumption: "accounts in dem Gym einladen".
        -- Let's stick to Public + Friends? Or generally Searchable?
        -- For now: All profiles are searchable by handle (common social app pattern), 
        -- but we rely on the privacy settings for content visibility.
    LIMIT 10;
END;
$$;

-- 6. RPC: Invite Client (Directly)
CREATE OR REPLACE FUNCTION invite_client_by_id(
    p_client_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    exists_check BOOLEAN;
BEGIN
    -- Check if relationship already exists
    SELECT EXISTS (
        SELECT 1 FROM trainer_relationships 
        WHERE trainer_id = auth.uid() AND client_id = p_client_id
    ) INTO exists_check;

    IF exists_check THEN
        RETURN jsonb_build_object('success', false, 'message', 'Relationship already exists');
    END IF;

    -- Insert Pending
    INSERT INTO trainer_relationships (trainer_id, client_id, status)
    VALUES (auth.uid(), p_client_id, 'pending');

    RETURN jsonb_build_object('success', true);
END;
$$;
