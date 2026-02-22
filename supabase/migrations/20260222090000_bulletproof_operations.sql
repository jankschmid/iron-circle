CREATE OR REPLACE FUNCTION assign_daily_operations()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today_start TIMESTAMPTZ := date_trunc('day', now());
  v_tomorrow_start TIMESTAMPTZ := v_today_start + interval '1 day';
  
  v_active_daily_count INT;
  v_active_weekly_count INT;
  v_user_goal TEXT;
  v_rerolls INT;
  v_needed INT;
  v_added_dailies INT := 0;
  v_added_weeklies INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT goal, rerolls_available INTO v_user_goal, v_rerolls FROM profiles WHERE id = v_user_id;

  -- 1. DAILIES
  SELECT COUNT(*) INTO v_active_daily_count 
  FROM user_operations uo
  JOIN operations_templates ot ON uo.template_id = ot.id
  WHERE uo.user_id = v_user_id 
    AND ot.type = 'daily'
    AND uo.expires_at > now();

  v_needed := 3 - v_active_daily_count;

  IF v_needed > 0 THEN
      IF v_active_daily_count = 0 THEN
         UPDATE profiles SET rerolls_available = 1 WHERE id = v_user_id AND rerolls_available < 1;
      END IF;

      INSERT INTO user_operations (user_id, template_id, expires_at)
      SELECT v_user_id, id, v_tomorrow_start
      FROM operations_templates
      WHERE type = 'daily'
        AND id NOT IN (
            SELECT template_id FROM user_operations 
            WHERE user_id = v_user_id AND expires_at > now()
        )
      ORDER BY 
        CASE 
          WHEN focus IS NULL THEN 2 
          WHEN v_user_goal IS NOT NULL AND v_user_goal = ANY(focus) THEN 1 
          ELSE 3 
        END ASC,
        random()
      LIMIT v_needed;
      
      GET DIAGNOSTICS v_added_dailies = ROW_COUNT;
  END IF;

  -- 2. WEEKLIES
  SELECT COUNT(*) INTO v_active_weekly_count
  FROM user_operations uo
  JOIN operations_templates ot ON uo.template_id = ot.id
  WHERE uo.user_id = v_user_id
    AND ot.type = 'weekly'
    AND uo.expires_at > now();

  IF v_active_weekly_count = 0 THEN
      INSERT INTO user_operations (user_id, template_id, expires_at)
      SELECT v_user_id, id, (date_trunc('week', now()) + interval '1 week')
      FROM operations_templates
      WHERE type = 'weekly'
        AND id NOT IN (
            SELECT template_id FROM user_operations 
            WHERE user_id = v_user_id AND expires_at > now()
        )
      ORDER BY 
        CASE 
          WHEN focus IS NULL THEN 2 
          WHEN v_user_goal IS NOT NULL AND v_user_goal = ANY(focus) THEN 1 
          ELSE 3 
        END ASC,
        random()
      LIMIT 1;

      GET DIAGNOSTICS v_added_weeklies = ROW_COUNT;
  END IF;

  RETURN json_build_object(
      'success', true, 
      'added_dailies', v_added_dailies, 
      'added_weeklies', v_added_weeklies,
      'old_daily_count', v_active_daily_count,
      'old_weekly_count', v_active_weekly_count
  );
END;
$$;
