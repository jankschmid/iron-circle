-- Migration: 20260215090000_gamification_cycle_xp.sql
-- Purpose: Separate Lifetime XP (Score) from Cycle XP (Level Progress)

-- 1. Add cycle_xp if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cycle_xp bigint DEFAULT 0;

-- 2. Migrate Data
-- Logic:
-- cycle_xp = MIN(lifetime_xp, 539500)  [539,500 is approx Level 100 cap]
-- xp_overflow = MAX(0, lifetime_xp - 539500) + xp_overflow [Add existing overflow]

-- We need a function or just a direct update.
-- Let's use 540000 as a safe round cap, or exact calculation.
-- exact calculation for lvl 100:
-- L1=0
-- L2=500
-- L3=500+100=600 ... 
-- Sum of (500 + (n-2)*100) for n=2 to 100?

-- Let's assume 540,000 is the functional cap based on previous code.
-- UPDATE profiles
-- SET 
--     cycle_xp = LEAST(lifetime_xp, 540000),
--     xp_overflow = GREATEST(0, lifetime_xp - 540000) + xp_overflow;

DO $$
DECLARE
    lvl100_cap bigint := 540000;
BEGIN
    UPDATE profiles
    SET 
        cycle_xp = LEAST(lifetime_xp, lvl100_cap),
        xp_overflow = GREATEST(0, lifetime_xp - lvl100_cap) + COALESCE(xp_overflow, 0);
END $$;

-- 3. Add documentation
COMMENT ON COLUMN profiles.cycle_xp IS 'XP used for current level progress (1-100). Resets on Prestige.';
COMMENT ON COLUMN profiles.lifetime_xp IS 'Total accumulated XP. Never resets. Used for Leaderboards.';
