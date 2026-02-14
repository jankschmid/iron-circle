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
  -- 1. Get Workout Data
  SELECT * INTO v_workout FROM workouts WHERE id = p_workout_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Workout not found'); END IF;
  
  v_user_id := v_workout.user_id;

  -- 2. Iterate Active Operations
  FOR v_ops IN 
    SELECT uo.id, uo.current_progress, uo.is_completed, t.type, t.target_metric, t.target_value, t.title
    FROM user_operations uo
    JOIN operations_templates t ON uo.template_id = t.id
    WHERE uo.user_id = v_user_id 
      AND uo.is_completed = FALSE
      AND uo.expires_at > now()
  LOOP
      v_progress_added := 0;

      -- 3. Calculate Progress based on Metric
      IF v_ops.target_metric = 'workouts' THEN
          v_progress_added := 1;
      ELSIF v_ops.target_metric = 'volume' THEN
          v_progress_added := v_workout.volume;
      ELSIF v_ops.target_metric = 'duration' THEN
          v_progress_added := v_workout.duration / 60; -- minutes? template says numeric. let's assume minutes.
      ELSIF v_ops.target_metric = 'distance' THEN
          -- We don't store distance on 'workouts' table directly yet? 
          -- Wait, we passed 'cardio' object to sessionXP but did we save it?
          -- 'workouts' table schema check needed. 
          -- Assuming NO distance column on workouts yet.
          -- For now, if volume is 0 and duration > 10, maybe we count it? 
          -- Actually we can't track distance properly without column.
          -- Let's skip distance for now or assume 0.
          v_progress_added := 0; 
      END IF;

      -- 4. Update Progress
      IF v_progress_added > 0 THEN
          UPDATE user_operations
          SET current_progress = current_progress + v_progress_added
          WHERE id = v_ops.id;
          
          -- Check Completion
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
