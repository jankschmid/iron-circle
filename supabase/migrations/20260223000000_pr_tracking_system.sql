-- ============================================================
-- PR Tracking System: 3-Pillar Personal Records
-- ============================================================
-- Table: user_exercise_prs
-- Stores the all-time best for each of the 3 PR types
-- per user per exercise. Upserted after every workout.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_exercise_prs (
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id TEXT        NOT NULL,         -- matches exercise IDs in workout_logs
    best_weight NUMERIC(8,2) NOT NULL DEFAULT 0,  -- Pillar 1: Max single-set weight
    best_e1rm   NUMERIC(8,2) NOT NULL DEFAULT 0,  -- Pillar 2: Epley estimated 1RM
    best_volume NUMERIC(10,2) NOT NULL DEFAULT 0, -- Pillar 3: Max volume in one workout
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, exercise_id)
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_user_exercise_prs_user
    ON public.user_exercise_prs (user_id);

-- RLS: users own their own PR rows
ALTER TABLE public.user_exercise_prs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own PRs" ON public.user_exercise_prs;
CREATE POLICY "Users manage own PRs"
    ON public.user_exercise_prs
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RPC: evaluate_workout_prs(p_workout_id UUID)
--
-- Called immediately after a workout is saved.
-- 1. Reads all completed sets from workout_logs for the workout
-- 2. Calculates the 3 metrics per exercise
-- 3. Compares against stored bests and upserts improvements
-- 4. Grants 500 XP per exercise that breaks at least one PR
--    (capped at 1 XP event per exercise per call)
-- 5. Returns JSONB array of broken PR events, e.g.:
--    [{ "exercise_id": "bench_press", "type": "E1RM",
--       "old_value": 110.5, "new_value": 118.3 }, ...]
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
            -- Pillar 1: Max weight in any single completed set
            MAX(s->>'weight')::NUMERIC AS max_weight,
            -- Pillar 2: Max Epley e1RM across all completed sets
            --   Epley: w * (1 + r/30)
            MAX(
                (s->>'weight')::NUMERIC * (1 + (s->>'reps')::NUMERIC / 30)
            ) AS max_e1rm,
            -- Pillar 3: Total volume for this exercise in this workout
            SUM((s->>'weight')::NUMERIC * (s->>'reps')::NUMERIC) AS total_volume
        FROM public.workout_logs wl,
             LATERAL jsonb_array_elements(wl.sets::JSONB) AS s
        WHERE wl.workout_id = p_workout_id
          AND (s->>'completed')::BOOLEAN = true
          AND (s->>'weight')::NUMERIC > 0
          AND (s->>'reps')::NUMERIC > 0
        GROUP BY wl.exercise_id
    LOOP
        v_new_weight := ROUND(rec.max_weight, 2);
        v_new_e1rm   := ROUND(rec.max_e1rm, 2);
        v_new_volume := ROUND(rec.total_volume, 2);
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

            -- Only announce as PR if there was prior history (skip "first ever" announcements)
            -- Comment out the lines below if you DO want first-session PRs announced
            -- v_pr_hit := TRUE;
            -- v_broken := v_broken || jsonb_build_object(...)
        ELSE
            -- Check each pillar independently, update only improved metrics
            DECLARE
                v_upd_weight NUMERIC := existing.best_weight;
                v_upd_e1rm   NUMERIC := existing.best_e1rm;
                v_upd_volume NUMERIC := existing.best_volume;
            BEGIN
                -- Pillar 1: Weight PR
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

                -- Pillar 2: E1RM PR
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

                -- Pillar 3: Volume PR
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

                -- Persist updated bests
                UPDATE public.user_exercise_prs
                SET
                    best_weight = v_upd_weight,
                    best_e1rm   = v_upd_e1rm,
                    best_volume = v_upd_volume,
                    updated_at  = now()
                WHERE user_id = v_user_id AND exercise_id = rec.exercise_id;
            END;
        END IF;

        -- XP: 500 per exercise that broke ≥1 PR (capped at 1 event per exercise)
        IF v_pr_hit THEN
            v_xp_total := v_xp_total + 500;
        END IF;
    END LOOP;

    -- Write bonus XP if any PRs were broken
    IF v_xp_total > 0 THEN
        UPDATE public.profiles
        SET
            current_xp  = COALESCE(current_xp, 0)  + v_xp_total,
            lifetime_xp = COALESCE(lifetime_xp, 0) + v_xp_total,
            updated_at  = now()
        WHERE id = v_user_id;
    END IF;

    RETURN v_broken;
END;
$$;

-- Grant execute to authenticated users (SECURITY DEFINER handles elevation)
GRANT EXECUTE ON FUNCTION public.evaluate_workout_prs(UUID) TO authenticated;
