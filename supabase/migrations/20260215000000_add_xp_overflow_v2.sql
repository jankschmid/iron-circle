-- Add xp_overflow column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS xp_overflow bigint DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN profiles.xp_overflow IS 'Stores excess XP earned after reaching the level cap (Level 100), used for a head start in the next Prestige.';
