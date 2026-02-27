-- ============================================================
-- Fix: evaluate_workout_prs — use increment_user_xp() instead
--      of a raw UPDATE so the level column is also recalculated
-- Fix: First-time PR logging — treat first logged workout for
--      an exercise as a PR (it IS a PR by definition)
-- ============================================================

CREATE OR REPLACE FUNCTION public.evaluate_workout_prs(p_workout_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id       UUID := auth.uid();
    v_broken        JSONB := '[]'::JSONB;
    v_xp_total      INT  := 0;
    rec             RECORD;
    existing        RECORD;
    v_new_weight    NUMERIC;
    v_new_e1rm      NUMERIC;
    v_new_volume    NUMERIC;
    v_pr_hit        BOOLEAN;
BEGIN
    -- Validate ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.workouts
        WHERE id = p_workout_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Workout not found or not owned by caller';
    END IF;

    -- Iterate over each exercise in this workout
    FOR rec IN
        SELECT
            wl.exercise_id,
            MAX((s->>'weight')::NUMERIC) AS max_weight,
            MAX(
                (s->>'weight')::NUMERIC * (1 + (s->>'reps')::NUMERIC / 30.0)
            ) AS max_e1rm,
            SUM((s->>'weight')::NUMERIC * (s->>'reps')::NUMERIC) AS total_volume
        FROM public.workout_logs wl,
             LATERAL jsonb_array_elements(wl.sets::JSONB) AS s
        WHERE wl.workout_id = p_workout_id
          AND (s->>'completed')::BOOLEAN = true
          AND (s->>'weight') IS NOT NULL
          AND (s->>'reps')   IS NOT NULL
          AND (s->>'weight')::NUMERIC > 0
          AND (s->>'reps')::NUMERIC   > 0
        GROUP BY wl.exercise_id
    LOOP
        v_new_weight := ROUND(COALESCE(rec.max_weight, 0), 2);
        v_new_e1rm   := ROUND(COALESCE(rec.max_e1rm, 0), 2);
        v_new_volume := ROUND(COALESCE(rec.total_volume, 0), 2);
        v_pr_hit     := FALSE;

        -- Fetch existing bests (if any)
        SELECT best_weight, best_e1rm, best_volume
        INTO existing
        FROM public.user_exercise_prs
        WHERE user_id = v_user_id AND exercise_id = rec.exercise_id;

        IF NOT FOUND THEN
            -- First time logging this exercise — everything is a PR!
            INSERT INTO public.user_exercise_prs
                (user_id, exercise_id, best_weight, best_e1rm, best_volume, updated_at)
            VALUES
                (v_user_id, rec.exercise_id, v_new_weight, v_new_e1rm, v_new_volume, now());

            -- First session IS a PR — grant XP
            v_pr_hit := TRUE;
            v_broken := v_broken || jsonb_build_array(jsonb_build_object(
                'exercise_id', rec.exercise_id,
                'type',        'FIRST_LOG',
                'old_value',   0,
                'new_value',   v_new_weight
            ));
        ELSE
            DECLARE
                v_upd_weight NUMERIC := existing.best_weight;
                v_upd_e1rm   NUMERIC := existing.best_e1rm;
                v_upd_volume NUMERIC := existing.best_volume;
            BEGIN
                IF v_new_weight > existing.best_weight THEN
                    v_upd_weight := v_new_weight;
                    v_pr_hit     := TRUE;
                    v_broken := v_broken || jsonb_build_array(jsonb_build_object(
                        'exercise_id', rec.exercise_id,
                        'type',        'WEIGHT',
                        'old_value',   existing.best_weight,
                        'new_value',   v_new_weight
                    ));
                END IF;

                IF v_new_e1rm > existing.best_e1rm THEN
                    v_upd_e1rm := v_new_e1rm;
                    v_pr_hit   := TRUE;
                    v_broken := v_broken || jsonb_build_array(jsonb_build_object(
                        'exercise_id', rec.exercise_id,
                        'type',        'E1RM',
                        'old_value',   existing.best_e1rm,
                        'new_value',   v_new_e1rm
                    ));
                END IF;

                IF v_new_volume > existing.best_volume THEN
                    v_upd_volume := v_new_volume;
                    v_pr_hit     := TRUE;
                    v_broken := v_broken || jsonb_build_array(jsonb_build_object(
                        'exercise_id', rec.exercise_id,
                        'type',        'VOLUME',
                        'old_value',   existing.best_volume,
                        'new_value',   v_new_volume
                    ));
                END IF;

                UPDATE public.user_exercise_prs
                SET
                    best_weight = v_upd_weight,
                    best_e1rm   = v_upd_e1rm,
                    best_volume = v_upd_volume,
                    updated_at  = now()
                WHERE user_id = v_user_id AND exercise_id = rec.exercise_id;
            END;
        END IF;

        IF v_pr_hit THEN
            v_xp_total := v_xp_total + 500;
        END IF;
    END LOOP;

    -- Write XP via increment_user_xp so level is ALSO recalculated
    IF v_xp_total > 0 THEN
        PERFORM public.increment_user_xp(v_xp_total);
    END IF;

    RETURN v_broken;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_workout_prs(UUID) TO authenticated;


-- ============================================================
-- Fix: check_operations_progress
-- Added public. schema prefix and COALESCE guards so it never
-- silently returns 0 progress due to NULL volume/duration
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_operations_progress(p_workout_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workout         public.workouts%ROWTYPE;
  v_user_id         UUID;
  v_ops             RECORD;
  v_progress_added  NUMERIC;
  v_completed_count INT     := 0;
  v_completed_names TEXT[]  := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO v_workout FROM public.workouts WHERE id = p_workout_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Workout not found');
  END IF;

  v_user_id := v_workout.user_id;

  FOR v_ops IN
    SELECT uo.id, uo.current_progress, uo.is_completed,
           t.type, t.target_metric, t.target_value, t.title
    FROM public.user_operations uo
    JOIN public.operations_templates t ON uo.template_id = t.id
    WHERE uo.user_id = v_user_id
      AND uo.is_completed = FALSE
      AND uo.expires_at > now()
  LOOP
    v_progress_added := 0;

    IF v_ops.target_metric = 'workouts' THEN
        v_progress_added := 1;
    ELSIF v_ops.target_metric = 'volume' THEN
        v_progress_added := COALESCE(v_workout.volume, 0);
    ELSIF v_ops.target_metric = 'duration' THEN
        v_progress_added := COALESCE(v_workout.duration, 0) / 60.0;
    ELSIF v_ops.target_metric = 'distance' THEN
        v_progress_added := COALESCE(v_workout.distance, 0);
    END IF;

    IF v_progress_added > 0 THEN
        UPDATE public.user_operations
        SET current_progress = current_progress + v_progress_added
        WHERE id = v_ops.id;

        IF (v_ops.current_progress + v_progress_added) >= v_ops.target_value THEN
            UPDATE public.user_operations
            SET is_completed = TRUE
            WHERE id = v_ops.id;
            v_completed_count := v_completed_count + 1;
            v_completed_names := array_append(v_completed_names, v_ops.title);
        END IF;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success',          true,
    'completed_count',  v_completed_count,
    'completed_names',  v_completed_names
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_operations_progress(UUID) TO authenticated;
