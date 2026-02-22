-- 1. ADD FOCUS TO TEMPLATES
ALTER TABLE operations_templates 
ADD COLUMN IF NOT EXISTS focus text[] DEFAULT NULL;

-- 2. MIGRATE PROFILES (Muscle -> Hypertrophy)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal TEXT;
UPDATE profiles 
SET goal = 'Hypertrophy' 
WHERE goal = 'Muscle';

-- 3. SEED FOCUS TAGS
-- Daily
UPDATE operations_templates SET focus = '{Hypertrophy, Strength}' WHERE title = 'Volume Eater';
UPDATE operations_templates SET focus = '{Hypertrophy, Strength}' WHERE title = 'Heavy Hitter';
UPDATE operations_templates SET focus = '{Endurance, Weight Loss}' WHERE title = 'Cardio Scout';
UPDATE operations_templates SET focus = '{Hypertrophy, Strength, Endurance, Weight Loss}' WHERE title = 'Morning Drill';
UPDATE operations_templates SET focus = '{Hypertrophy, Strength, Endurance, Weight Loss}' WHERE title = 'Just Show Up';

-- Weekly
UPDATE operations_templates SET focus = '{Hypertrophy, Strength, Endurance, Weight Loss}' WHERE title = 'Iron Consistency';
UPDATE operations_templates SET focus = '{Endurance, Weight Loss}' WHERE title = 'Marathon Man';
UPDATE operations_templates SET focus = '{Hypertrophy, Strength}' WHERE title = 'Century Club';


-- 4. UPDATE ASSIGN RPC
CREATE OR REPLACE FUNCTION assign_daily_operations()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today_start TIMESTAMPTZ := date_trunc('day', now());
  v_tomorrow_start TIMESTAMPTZ := v_today_start + interval '1 day';
  v_week_start TIMESTAMPTZ := date_trunc('week', now());
  v_next_week_start TIMESTAMPTZ := v_week_start + interval '1 week';
  
  v_count_daily INT;
  v_count_weekly INT;
  v_user_goal TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get User Goal
  SELECT goal INTO v_user_goal FROM profiles WHERE id = v_user_id;

  -- Daily Check
  SELECT COUNT(*) INTO v_count_daily 
  FROM user_operations 
  WHERE user_id = v_user_id 
    AND expires_at >= v_tomorrow_start 
    AND created_at >= v_today_start;

  IF v_count_daily = 0 THEN
     -- Reset Rerolls
     UPDATE profiles SET rerolls_available = 1 WHERE id = v_user_id;
     
     -- Assign 3 Targeted Dailies
     -- Priority: Matches Focus OR Universal (No focus set)
     INSERT INTO user_operations (user_id, template_id, expires_at)
     SELECT v_user_id, id, v_tomorrow_start
     FROM operations_templates
     WHERE type = 'daily'
       AND (focus IS NULL OR v_user_goal = ANY(focus))
     ORDER BY random()
     LIMIT 3;
  END IF;

  -- Weekly Check
  SELECT COUNT(*) INTO v_count_weekly
  FROM user_operations
  WHERE user_id = v_user_id
    AND expires_at >= v_next_week_start
    AND created_at >= v_week_start;

  IF v_count_weekly = 0 THEN
      INSERT INTO user_operations (user_id, template_id, expires_at)
      SELECT v_user_id, id, v_next_week_start
      FROM operations_templates
      WHERE type = 'weekly'
        AND (focus IS NULL OR v_user_goal = ANY(focus))
      ORDER BY random()
      LIMIT 1;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;


-- 5. UPDATE REROLL RPC
CREATE OR REPLACE FUNCTION reroll_operation(p_op_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_op user_operations%ROWTYPE;
  v_rerolls INT;
  v_new_template_id UUID;
  v_template_type TEXT;
  v_user_goal TEXT;
  v_new_op_id UUID;
BEGIN
  SELECT * INTO v_op FROM user_operations WHERE id = p_op_id AND user_id = v_user_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Operation not found'); END IF;

  SELECT type INTO v_template_type FROM operations_templates WHERE id = v_op.template_id;
  SELECT goal INTO v_user_goal FROM profiles WHERE id = v_user_id;

  SELECT rerolls_available INTO v_rerolls FROM profiles WHERE id = v_user_id;
  IF v_rerolls < 1 THEN
     RETURN json_build_object('success', false, 'message', 'No tactical overrides left commander!');
  END IF;

  -- Find Replacement (Targeted)
  SELECT id INTO v_new_template_id
  FROM operations_templates
  WHERE type = v_template_type
    AND id != v_op.template_id
    AND (focus IS NULL OR v_user_goal = ANY(focus))
    AND id NOT IN (
        SELECT template_id FROM user_operations 
        WHERE user_id = v_user_id 
        AND expires_at = v_op.expires_at
    )
  ORDER BY random()
  LIMIT 1;

  IF v_new_template_id IS NULL THEN
      RETURN json_build_object('success', false, 'message', 'No other suitable missions available.');
  END IF;

  DELETE FROM user_operations WHERE id = p_op_id;
  
  INSERT INTO user_operations (user_id, template_id, expires_at, created_at)
  VALUES (v_user_id, v_new_template_id, v_op.expires_at, now())
  RETURNING id INTO v_new_op_id;

  UPDATE profiles SET rerolls_available = rerolls_available - 1 WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'new_op_id', v_new_op_id);
END;
$$;
