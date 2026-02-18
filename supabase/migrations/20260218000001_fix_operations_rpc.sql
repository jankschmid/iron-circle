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
  v_needed INT;
  v_rerolls INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- 1. Get User Details
  SELECT goal, rerolls_available INTO v_user_goal, v_rerolls FROM profiles WHERE id = v_user_id;

  -- 2. DAILY OPERATIONS LOGIC
  -- Count strictly active daily operations (not expired, not completed?) 
  -- Actually, we usually want to show completed ones for the day too.
  -- So we check for operations created today OR expiring in the future.
  SELECT COUNT(*) INTO v_active_daily_count 
  FROM user_operations uo
  JOIN operations_templates ot ON uo.template_id = ot.id
  WHERE uo.user_id = v_user_id 
    AND ot.type = 'daily'
    AND uo.expires_at > now(); -- Only count currently active ones

  -- If we have fewer than 3, we need to add some.
  v_needed := 3 - v_active_daily_count;

  IF v_needed > 0 THEN
      -- Reset Rerolls if it's a "fresh" day (simplistic check: if we are adding 3, it's likely a new set)
      -- Better logic: Reset rerolls if last_reroll_reset < today? 
      -- For now, let's just ensure they have at least 1 if they are getting new missions.
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
        -- PRIORITY 1: Matches Focus (TRUE > FALSE)
        (v_user_goal = ANY(focus)) DESC,
        -- PRIORITY 2: Universal (focus IS NULL) - slight penalty vs specific match? 
        -- Actually, we want Specific > Universal > Mismatched.
        -- If Focus is defined and doesn't match, it shouldn't be picked unless necessary.
        CASE 
            WHEN v_user_goal = ANY(focus) THEN 1  -- Exact Match
            WHEN focus IS NULL THEN 2             -- Universal
            ELSE 3                                -- Mismatch (Avoid if possible)
        END ASC,
        random()
      LIMIT v_needed;
  END IF;

  -- 3. WEEKLY OPERATIONS LOGIC
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
      ORDER BY 
        (v_user_goal = ANY(focus)) DESC,
        random()
      LIMIT 1;
  END IF;

  RETURN json_build_object('success', true, 'added', v_needed);
END;
$$;
