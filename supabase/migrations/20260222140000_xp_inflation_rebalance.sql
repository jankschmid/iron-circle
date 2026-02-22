-- Migration to execute XP Inflation (approx 5x) across all gamification tasks
-- The base rewards for basic workflows are jumping from ~100 to ~500.

-- Update Solo Operations
-- We floor the rewards at 800 for Dailies and 2500 for Weeklies just in case some are very low
UPDATE operations_templates
SET xp_reward = GREATEST(xp_reward * 5, 800)
WHERE type = 'daily';

UPDATE operations_templates
SET xp_reward = GREATEST(xp_reward * 5, 2500)
WHERE type = 'weekly';

-- Update Community Goals (Massive effort tasks)
-- Floor at 5000XP
UPDATE community_goal_templates
SET xp_reward = GREATEST(xp_reward * 5, 5000);
