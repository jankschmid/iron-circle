-- Fix missing columns for Gym Access Codes
-- This migration ensures columns exist if a previous migration was skipped or failed

ALTER TABLE "public"."gyms" 
ADD COLUMN IF NOT EXISTS "access_code_trainer" TEXT UNIQUE;

ALTER TABLE "public"."gyms" 
ADD COLUMN IF NOT EXISTS "access_code_admin" TEXT UNIQUE;

-- Ensure the trigger function exists and is correct (idempotent)
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

-- Ensure Trigger is active
DROP TRIGGER IF EXISTS trigger_set_gym_codes ON gyms;
CREATE TRIGGER trigger_set_gym_codes
BEFORE INSERT ON gyms
FOR EACH ROW
EXECUTE FUNCTION set_gym_access_codes();
