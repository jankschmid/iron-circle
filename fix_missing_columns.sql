
-- FIX MISSING COLUMNS
-- Run this in Supabase SQL Editor to restore Gamification & Operations columns

-- 1. Levels & XP
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifetime_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prestige_level INTEGER DEFAULT 0;

-- 2. Goals & Operations
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal TEXT DEFAULT 'Muscle';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rerolls_available INTEGER DEFAULT 1;

-- 3. Optimization Indices
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level);
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(current_xp);

-- 4. Verify (Optional - just to see output)
SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
