-- Migration: Gym Access Codes & Onboarding Profile Stats

-- 1. Update Profiles with Body Stats
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS height NUMERIC, -- in cm
ADD COLUMN IF NOT EXISTS weight NUMERIC; -- in kg (initial baseline)

-- 2. Add Access Codes to Gyms
ALTER TABLE gyms
ADD COLUMN IF NOT EXISTS access_code_trainer TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS access_code_admin TEXT UNIQUE;

-- 3. Function to Generate Random Codes
CREATE OR REPLACE FUNCTION generate_gym_code(length INT DEFAULT 8)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- 4. Trigger to Auto-Generate Codes for New Gyms
CREATE OR REPLACE FUNCTION set_gym_access_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.access_code_trainer IS NULL THEN
        NEW.access_code_trainer := 'TR-' || generate_gym_code(6);
    END IF;
    IF NEW.access_code_admin IS NULL THEN
        NEW.access_code_admin := 'AD-' || generate_gym_code(8);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_gym_codes ON gyms;
CREATE TRIGGER trigger_set_gym_codes
BEFORE INSERT ON gyms
FOR EACH ROW
EXECUTE FUNCTION set_gym_access_codes();

-- 5. Backfill existing gyms (Important!)
UPDATE gyms 
SET access_code_trainer = 'TR-' || generate_gym_code(6) 
WHERE access_code_trainer IS NULL;

UPDATE gyms 
SET access_code_admin = 'AD-' || generate_gym_code(8) 
WHERE access_code_admin IS NULL;

-- 6. RPC: Join Gym with Code (Secure)
CREATE OR REPLACE FUNCTION join_gym_with_code(
    p_code TEXT
)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_gym_id UUID;
    assigned_role TEXT;
    gym_name TEXT;
    existing_role TEXT;
BEGIN
    -- trim code
    p_code := trim(upper(p_code));

    -- Check if Trainer Code
    SELECT id, name INTO target_gym_id, gym_name 
    FROM gyms WHERE access_code_trainer = p_code;

    IF target_gym_id IS NOT NULL THEN
        assigned_role := 'trainer';
    ELSE
        -- Check if Admin Code
        SELECT id, name INTO target_gym_id, gym_name 
        FROM gyms WHERE access_code_admin = p_code;
        
        IF target_gym_id IS NOT NULL THEN
            assigned_role := 'admin';
        END IF;
    END IF;

    -- If no match
    IF target_gym_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Access Code');
    END IF;

    -- Check if user already in gym
    SELECT role INTO existing_role
    FROM user_gyms 
    WHERE user_id = auth.uid() AND gym_id = target_gym_id;

    IF existing_role IS NOT NULL THEN
        -- Update Role
        UPDATE user_gyms 
        SET role = assigned_role 
        WHERE user_id = auth.uid() AND gym_id = target_gym_id;
        
        -- Also update community role?
        UPDATE community_members
        SET role = assigned_role 
        WHERE user_id = auth.uid() 
          AND community_id IN (SELECT id FROM communities WHERE gym_id = target_gym_id);
    ELSE
        -- Insert new membership
        INSERT INTO user_gyms (user_id, gym_id, role, label, is_default)
        VALUES (auth.uid(), target_gym_id, assigned_role, gym_name, true); -- Make default if joining staff
        
        -- Also join community
        INSERT INTO community_members (community_id, user_id, role)
        SELECT id, auth.uid(), assigned_role
        FROM communities WHERE gym_id = target_gym_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'gym_id', target_gym_id, 
        'role', assigned_role, 
        'gym_name', gym_name
    );
END;
$$;

-- 7. RPC: Regenerate Codes (Admin Only)
CREATE OR REPLACE FUNCTION regenerate_gym_codes(
    p_gym_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    -- Check permissions (must be admin/owner of THIS gym)
    SELECT role INTO caller_role
    FROM user_gyms
    WHERE user_id = auth.uid() AND gym_id = p_gym_id;

    IF caller_role NOT IN ('admin', 'owner') THEN
         RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Update
    UPDATE gyms
    SET access_code_trainer = 'TR-' || generate_gym_code(6),
        access_code_admin = 'AD-' || generate_gym_code(8)
    WHERE id = p_gym_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
