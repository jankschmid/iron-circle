-- Add Gamification Columns to Profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_xp INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS prestige_level INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_xp BIGINT DEFAULT 0;

-- Comment on columns
COMMENT ON COLUMN profiles.level IS 'Current user level (1-50)';
COMMENT ON COLUMN profiles.current_xp IS 'XP within current level';
COMMENT ON COLUMN profiles.prestige_level IS 'Rank reset count (Prestige 0-12)';
COMMENT ON COLUMN profiles.lifetime_xp IS 'Total accumulated XP across all prestiges';
