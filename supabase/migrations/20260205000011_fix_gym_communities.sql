-- Migration: Backfill Missing Communities
-- Date: 2026-02-05

-- 1. Insert missing communities for existing gyms
INSERT INTO communities (gym_id, name, description, created_at)
SELECT id, name, 'Community for ' || name, NOW()
FROM gyms
WHERE id NOT IN (SELECT gym_id FROM communities);

-- 2. (Optional) Check triggers? 
-- We assume the trigger is robust enough to work if the community exists. 
-- If the trigger was: INSERT INTO community_members VALUES ((SELECT id...), ...)
-- It will now find an ID and succeed.
