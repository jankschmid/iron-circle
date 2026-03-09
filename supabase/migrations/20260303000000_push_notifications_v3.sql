-- ==============================================================================
-- Migration: Push Notifications V3 (Trainers & Smart Streak Retention)
-- ==============================================================================

-----------------------------------------------------------
-- 1. Trainer Requests Trigger
-----------------------------------------------------------
DROP TRIGGER IF EXISTS trainer_relationships_push_trigger ON trainer_relationships;
CREATE TRIGGER trainer_relationships_push_trigger
AFTER INSERT OR UPDATE ON trainer_relationships
FOR EACH ROW EXECUTE FUNCTION notify_push_dispatcher();

-----------------------------------------------------------
-- 2. Enhanced Retention RPC
-- Finds users whose Streak Grace Period is expiring in < 24h
-----------------------------------------------------------
DROP FUNCTION IF EXISTS get_inactive_users_for_retention();

CREATE OR REPLACE FUNCTION get_inactive_users_for_retention()
RETURNS TABLE(user_id uuid, push_token text, hours_left numeric) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      p.id, 
      p.push_token,
      p.last_workout_date,
      p.streak_status,
      COALESCE(p.yearly_workout_goal, 104) AS yearly_workout_goal,
      GREATEST(COALESCE(p.yearly_workout_goal, 104)::NUMERIC / 52, 1) as weekly_target
    FROM profiles p
    WHERE p.push_token IS NOT NULL
      AND p.push_token != ''
      AND p.last_workout_date IS NOT NULL
      AND p.streak_status = 'active'
  ),
  calculated_grace AS (
    SELECT
      id,
      push_token,
      -- grace_hours = (7 / weekly_target * 24) + 24
      ROUND((7.0 / weekly_target * 24) + 24, 1) AS grace_hours,
      EXTRACT(EPOCH FROM (now() - last_workout_date)) / 3600 AS hours_since
    FROM user_stats
  )
  SELECT 
    id AS user_id, 
    push_token, 
    ROUND(grace_hours - hours_since, 1) AS hours_left
  FROM calculated_grace
  -- Condition: They haven't worked out recently, they are within their grace period, 
  -- AND the grace period runs out in less than 24 hours.
  WHERE hours_since > 0 
    AND (grace_hours - hours_since) > 0 
    AND (grace_hours - hours_since) <= 24.0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
