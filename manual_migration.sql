-- 1. Operations Templates
CREATE TABLE IF NOT EXISTS operations_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('daily', 'weekly')),
  target_metric TEXT CHECK (target_metric IN ('volume', 'workouts', 'distance', 'duration')),
  target_value NUMERIC NOT NULL,
  xp_reward INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Operations (Active/Completed)
CREATE TABLE IF NOT EXISTS user_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES operations_templates(id),
  current_progress NUMERIC DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  is_claimed BOOLEAN DEFAULT FALSE, -- claimed XP
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, template_id, expires_at)
);

-- RLS
ALTER TABLE operations_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read templates" ON operations_templates FOR SELECT USING (true);

ALTER TABLE user_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own operations" ON user_operations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own operations" ON user_operations FOR UPDATE USING (auth.uid() = user_id);

-- 3. Add Rerolls to Profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rerolls_available') THEN
        ALTER TABLE profiles ADD COLUMN rerolls_available INTEGER DEFAULT 1;
    END IF;
END $$;


-- 4. SEED DATA
INSERT INTO operations_templates (title, description, type, target_metric, target_value, xp_reward) VALUES
('Morning Drill', 'Complete a workout (any kind).', 'daily', 'workouts', 1, 100),
('Volume Eater', 'Move 5,000kg total volume.', 'daily', 'volume', 5000, 100),
('Cardio Scout', 'Run/Walk or Cycle for 2km.', 'daily', 'distance', 2, 100),
('Heavy Hitter', 'Move 10,000kg total volume.', 'daily', 'volume', 10000, 150),
('Just Show Up', 'Log a workout.', 'daily', 'workouts', 1, 50),
('Iron Consistency', 'Complete 3 workouts this week.', 'weekly', 'workouts', 3, 500),
('Marathon Man', 'Accumulate 20km distance this week.', 'weekly', 'distance', 20, 500),
('Century Club', 'Move 100,000kg volume this week.', 'weekly', 'volume', 100000, 600)
ON CONFLICT DO NOTHING;


-- 5. RPC: Assign Daily Operations (The "Lazy Cron")
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
  v_new_daily_ids UUID[];
  v_new_weekly_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'Not authenticated'); END IF;

  SELECT COUNT(*) INTO v_count_daily 
  FROM user_operations 
  WHERE user_id = v_user_id 
    AND expires_at = v_tomorrow_start 
    AND created_at >= v_today_start;

  IF v_count_daily = 0 THEN
     -- Reset Rerolls
     UPDATE profiles SET rerolls_available = 1 WHERE id = v_user_id;
     
     -- Assign 3 Random Dailies
     INSERT INTO user_operations (user_id, template_id, expires_at)
     SELECT v_user_id, id, v_tomorrow_start
     FROM operations_templates
     WHERE type = 'daily'
     ORDER BY random()
     LIMIT 3;
  END IF;

  SELECT COUNT(*) INTO v_count_weekly
  FROM user_operations
  WHERE user_id = v_user_id
    AND expires_at = v_next_week_start
    AND created_at >= v_week_start;

  IF v_count_weekly = 0 THEN
      INSERT INTO user_operations (user_id, template_id, expires_at)
      SELECT v_user_id, id, v_next_week_start
      FROM operations_templates
      WHERE type = 'weekly'
      ORDER BY random()
      LIMIT 1;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;


-- 6. RPC: Reroll Operation
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
  v_new_op_id UUID;
BEGIN
  SELECT * INTO v_op FROM user_operations WHERE id = p_op_id AND user_id = v_user_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Operation not found'); END IF;

  SELECT type INTO v_template_type FROM operations_templates WHERE id = v_op.template_id;

  SELECT rerolls_available INTO v_rerolls FROM profiles WHERE id = v_user_id;
  IF v_rerolls < 1 THEN RETURN json_build_object('success', false, 'message', 'No tactical overrides left commander!'); END IF;

  SELECT id INTO v_new_template_id
  FROM operations_templates
  WHERE type = v_template_type
    AND id != v_op.template_id
    AND id NOT IN (
        SELECT template_id FROM user_operations 
        WHERE user_id = v_user_id 
        AND expires_at = v_op.expires_at
    )
  ORDER BY random()
  LIMIT 1;

  IF v_new_template_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'No other missions available.'); END IF;

  DELETE FROM user_operations WHERE id = p_op_id;
  
  INSERT INTO user_operations (user_id, template_id, expires_at, created_at)
  VALUES (v_user_id, v_new_template_id, v_op.expires_at, now())
  RETURNING id INTO v_new_op_id;

  UPDATE profiles SET rerolls_available = rerolls_available - 1 WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'new_op_id', v_new_op_id);
END;
$$;


-- 7. RPC: Claim Reward
CREATE OR REPLACE FUNCTION claim_operation_reward(p_op_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_op user_operations%ROWTYPE;
  v_tpl operations_templates%ROWTYPE;
  v_xp INT;
BEGIN
  SELECT * INTO v_op FROM user_operations WHERE id = p_op_id AND user_id = auth.uid();
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Not found'); END IF;
  
  IF v_op.is_claimed THEN RETURN json_build_object('success', false, 'message', 'Already claimed'); END IF;
  IF NOT v_op.is_completed THEN RETURN json_build_object('success', false, 'message', 'Mission not complete'); END IF;

  SELECT * INTO v_tpl FROM operations_templates WHERE id = v_op.template_id;
  v_xp := v_tpl.xp_reward;

  UPDATE profiles 
  SET current_xp = COALESCE(current_xp, 0) + v_xp,
      lifetime_xp = COALESCE(lifetime_xp, 0) + v_xp,
      xp = COALESCE(xp, 0) + v_xp
  WHERE id = auth.uid();

  UPDATE user_operations SET is_claimed = TRUE WHERE id = v_op.id;

  RETURN json_build_object('success', true, 'xp_gained', v_xp);
END;
$$;


-- 8. RPC: Check Operations Progress (The "Trigger")
CREATE OR REPLACE FUNCTION check_operations_progress(p_workout_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workout workouts%ROWTYPE;
  v_user_id UUID;
  v_ops RECORD;
  v_progress_added NUMERIC;
  v_completed_count INT := 0;
  v_completed_names TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO v_workout FROM workouts WHERE id = p_workout_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Workout not found'); END IF;
  
  v_user_id := v_workout.user_id;

  FOR v_ops IN 
    SELECT uo.id, uo.current_progress, uo.is_completed, t.type, t.target_metric, t.target_value, t.title
    FROM user_operations uo
    JOIN operations_templates t ON uo.template_id = t.id
    WHERE uo.user_id = v_user_id 
      AND uo.is_completed = FALSE
      AND uo.expires_at > now()
  LOOP
      v_progress_added := 0;

      IF v_ops.target_metric = 'workouts' THEN
          v_progress_added := 1;
      ELSIF v_ops.target_metric = 'volume' THEN
          v_progress_added := v_workout.volume;
      ELSIF v_ops.target_metric = 'duration' THEN
          v_progress_added := v_workout.duration / 60; 
      ELSIF v_ops.target_metric = 'distance' THEN
          v_progress_added := 0; 
      END IF;

      IF v_progress_added > 0 THEN
          UPDATE user_operations
          SET current_progress = current_progress + v_progress_added
          WHERE id = v_ops.id;
          
          IF (v_ops.current_progress + v_progress_added) >= v_ops.target_value THEN
              UPDATE user_operations SET is_completed = TRUE WHERE id = v_ops.id;
              v_completed_count := v_completed_count + 1;
              v_completed_names := array_append(v_completed_names, v_ops.title);
          END IF;
      END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true, 
    'completed_count', v_completed_count,
    'completed_names', v_completed_names
  );
END;
$$;
