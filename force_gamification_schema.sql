
-- Force Schema Update for Gamification
DO $$
BEGIN
    -- Check if columns exist, if not add them
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'level') THEN
        ALTER TABLE profiles ADD COLUMN level INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'current_xp') THEN
        ALTER TABLE profiles ADD COLUMN current_xp INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'lifetime_xp') THEN
        ALTER TABLE profiles ADD COLUMN lifetime_xp INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'prestige_level') THEN
        ALTER TABLE profiles ADD COLUMN prestige_level INTEGER DEFAULT 0;
    END IF;

    -- Ensure indices exist
    CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level);
    CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(current_xp);

    -- DROP ANY BAD TRIGGERS?
    -- Only safe ones...
END $$;
