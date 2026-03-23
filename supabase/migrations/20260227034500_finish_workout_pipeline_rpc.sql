-- ============================================================
-- Fix: Unified finish_workout RPC that does all post-workout
-- DB operations atomically in one roundtrip:
--   1. update_streak_on_workout → streak + multiplier
--   2. check_operations_progress → missions
--   3. evaluate_workout_prs → PRs (calls increment_user_xp internally)
--   4. increment_user_xp for base workout XP (with streak multiplier)
-- Returns full summary JSONB.
-- ============================================================

CREATE OR REPLACE FUNCTION public.finish_workout_pipeline(
    p_workout_id    UUID,
    p_base_xp       INT DEFAULT 500   -- calculated client-side base XP
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id           UUID := auth.uid();
    v_streak_result     JSONB;
    v_ops_result        JSON;
    v_pr_result         JSONB;
    v_xp_result         JSONB;
    v_streak_multiplier NUMERIC;
    v_total_xp          INT;
    v_bonus_xp          INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate workout ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.workouts
        WHERE id = p_workout_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Workout % not found or not owned by caller', p_workout_id;
    END IF;

    -- 1. Streak update
    BEGIN
        SELECT public.update_streak_on_workout(p_workout_id) INTO v_streak_result;
    EXCEPTION WHEN OTHERS THEN
        v_streak_result := jsonb_build_object(
            'current_streak', 1, 'longest_streak', 1,
            'multiplier', 1.0, 'was_frozen', false,
            'grace_hours', 108, 'error', SQLERRM
        );
    END;

    -- 2. Operations / Missions progress
    BEGIN
        SELECT public.check_operations_progress(p_workout_id) INTO v_ops_result;
    EXCEPTION WHEN OTHERS THEN
        v_ops_result := json_build_object('success', false, 'error', SQLERRM);
    END;

    -- 3. PR Evaluation — this also calls increment_user_xp internally for PR XP
    BEGIN
        SELECT public.evaluate_workout_prs(p_workout_id) INTO v_pr_result;
    EXCEPTION WHEN OTHERS THEN
        v_pr_result := '[]'::JSONB;
        RAISE WARNING 'evaluate_workout_prs failed: %', SQLERRM;
    END;

    -- 4. Base XP (with streak multiplier applied)
    v_streak_multiplier := COALESCE((v_streak_result->>'multiplier')::NUMERIC, 1.0);

    -- If frozen, no multiplier bonus
    IF (v_streak_result->>'was_frozen')::BOOLEAN THEN
        v_streak_multiplier := 1.0;
    END IF;

    v_total_xp := GREATEST(p_base_xp, 0);
    v_bonus_xp := CASE
        WHEN v_streak_multiplier > 1.0 THEN
            FLOOR(v_total_xp * (v_streak_multiplier - 1))::INT
        ELSE 0
    END;
    v_total_xp := v_total_xp + v_bonus_xp;

    BEGIN
        SELECT public.increment_user_xp(v_total_xp) INTO v_xp_result;
    EXCEPTION WHEN OTHERS THEN
        v_xp_result := jsonb_build_object('error', SQLERRM, 'new_level', 1, 'did_level_up', false);
        RAISE WARNING 'increment_user_xp failed: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'streak',       v_streak_result,
        'operations',   v_ops_result,
        'broken_prs',   COALESCE(v_pr_result, '[]'::JSONB),
        'xp',           v_xp_result,
        'base_xp',      p_base_xp,
        'bonus_xp',     v_bonus_xp,
        'total_xp',     v_total_xp
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finish_workout_pipeline(UUID, INT) TO authenticated;
