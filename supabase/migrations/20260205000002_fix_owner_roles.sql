-- Migration: Fix Owner Roles
-- Date: 2026-02-05

-- 1. Update user_gyms to set role='owner' for the creator of the gym
UPDATE user_gyms
SET role = 'owner'
FROM gyms
WHERE user_gyms.gym_id = gyms.id
  AND user_gyms.user_id = gyms.created_by;

-- 2. Ensure role is not null for others
UPDATE user_gyms
SET role = 'member'
WHERE role IS NULL;
