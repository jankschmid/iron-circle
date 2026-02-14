-- Add 'goal' column to profiles (for Goal Selector)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'goal') THEN
        ALTER TABLE profiles ADD COLUMN goal TEXT DEFAULT 'Muscle';
    END IF;
END $$;
