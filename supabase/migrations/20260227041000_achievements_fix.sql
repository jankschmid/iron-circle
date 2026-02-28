-- Drop old tables that have an incompatible legacy schema (e.g. UUID IDs, missing columns, extra NOT NULL criteria)
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;

-- Re-create achievements table from scratch
CREATE TABLE public.achievements (
    id          TEXT        PRIMARY KEY,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL,
    emoji       TEXT        NOT NULL DEFAULT '🏅',
    category    TEXT        NOT NULL DEFAULT 'general',
    xp_reward   INT         NOT NULL DEFAULT 250,
    is_hidden   BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Achievements public read" ON public.achievements;
CREATE POLICY "Achievements public read"
    ON public.achievements FOR SELECT USING (true);

-- Also ensure user_achievements table has the right structure
CREATE TABLE IF NOT EXISTS public.user_achievements (
    user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT        NOT NULL,
    unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user
    ON public.user_achievements (user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own achievements" ON public.user_achievements;
CREATE POLICY "Users read own achievements"
    ON public.user_achievements FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System inserts achievements" ON public.user_achievements;
CREATE POLICY "System inserts achievements"
    ON public.user_achievements FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Seed / upsert all 16 achievements
INSERT INTO public.achievements (id, name, description, emoji, category, xp_reward, is_hidden) VALUES

-- THE INITIATION
('first_blood',       'First Blood',          'Complete your very first workout.',                                           '🩸', 'initiation', 500,  false),
('the_architect',     'The Architect',         'Create and save your first custom workout template.',                       '🏗️', 'initiation', 300,  false),
('profile_polished',  'Profile Polished',      'Complete the full setup and set a profile picture.',                       '💎', 'initiation', 200,  false),

-- THE GRIND
('habit_builder',     'Habit Builder',         'Keep your streak alive for 14 days straight.',                             '🧱', 'grind',      750,  false),
('iron_will',         'Iron Will',             'Keep your streak alive for 30 days straight.',                             '🛡️', 'grind',      1500, false),
('unstoppable_force', 'Unstoppable Force',     'Reach the maximum XP streak multiplier (20+ workout streak).',             '🚂', 'grind',      1000, false),
('saved_by_bell',     'Saved by the Bell',     'Complete a workout with less than 12 hours left on your Grace Period.',   '🔔', 'grind',      500,  true),

-- HEAVY DUTY
('gravity_defier',    'Gravity Defier',        'Hit 3 or more Personal Records in a single workout.',                      '🚀', 'heavy_duty', 1000, false),
('one_ton_club',      'One Ton Club',          'Move 1,000 kg of total volume in a single workout.',                      '🦍', 'heavy_duty', 750,  false),
('iron_titan',        'Iron Titan',            'Lift a cumulative lifetime volume of 1,000,000 kg.',                      '🗿', 'heavy_duty', 2000, false),
('pump_is_real',      'The Pump is Real',      'Complete a workout with more than 20 total sets.',                        '🎈', 'heavy_duty', 500,  false),

-- SECRET
('vampire',           'Vampire',               'Finish a workout between midnight and 3 AM.',                              '🦇', 'secret',     750,  true),
('never_skip_legs',   'Never Skip Leg Day',    'Complete a workout with at least 4 different leg exercises.',             '🍗', 'secret',     500,  true),
('marathon_man',      'Marathon Man',          'Have an active workout session lasting longer than 2.5 hours.',           '🏃', 'secret',     750,  true),

-- SOCIAL
('hype_machine',      'Hype Machine',          'Send your first Hype to a friend in the Live Circle.',                   '🔥', 'social',     200,  false),
('wolfpack',          'Wolfpack',              'Connect with 3 friends on IronCircle.',                                   '🐺', 'social',     500,  false)

ON CONFLICT (id) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    emoji       = EXCLUDED.emoji,
    category    = EXCLUDED.category,
    xp_reward   = EXCLUDED.xp_reward,
    is_hidden   = EXCLUDED.is_hidden,
    updated_at  = now();

-- unlock_achievement helper
CREATE OR REPLACE FUNCTION public.unlock_achievement(
    p_user_id        UUID,
    p_achievement_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reward INT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.user_achievements
        WHERE user_id = p_user_id AND achievement_id = p_achievement_id
    ) THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
    VALUES (p_user_id, p_achievement_id, now());

    SELECT xp_reward INTO v_reward
    FROM public.achievements WHERE id = p_achievement_id;

    IF COALESCE(v_reward, 0) > 0 THEN
        PERFORM public.increment_user_xp(v_reward);
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_achievement(UUID, TEXT) TO authenticated;

-- check_achievements_for_workout
CREATE OR REPLACE FUNCTION public.check_achievements_for_workout(p_workout_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id           UUID := auth.uid();
    v_workout           RECORD;
    v_profile           RECORD;
    v_total_workouts    BIGINT;
    v_total_sets        INT;
    v_total_legs        INT;
    v_pr_count          BIGINT;
    v_newly_unlocked    JSONB := '[]'::JSONB;
    v_did_unlock        BOOLEAN;
    v_end_hour          INT;
    v_duration_minutes  NUMERIC;
    v_grace_hours       NUMERIC;
    v_weekly_target     NUMERIC;
    v_hours_since       NUMERIC;
BEGIN
    IF v_user_id IS NULL THEN RETURN '[]'::JSONB; END IF;

    SELECT * INTO v_workout FROM public.workouts WHERE id = p_workout_id AND user_id = v_user_id;
    IF NOT FOUND THEN RETURN '[]'::JSONB; END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND THEN RETURN '[]'::JSONB; END IF;

    SELECT COUNT(*) INTO v_total_workouts FROM public.workouts WHERE user_id = v_user_id;

    -- Total completed sets in this workout
    SELECT COALESCE(SUM(
        (SELECT COUNT(*) FROM jsonb_array_elements(wl.sets::JSONB) s
         WHERE (s->>'completed')::BOOLEAN = true)
    ), 0)::INT INTO v_total_sets
    FROM public.workout_logs wl WHERE wl.workout_id = p_workout_id;

    -- Distinct leg exercises
    SELECT COUNT(DISTINCT wl.exercise_id)::INT INTO v_total_legs
    FROM public.workout_logs wl
    LEFT JOIN public.exercises e ON e.id = wl.exercise_id
    WHERE wl.workout_id = p_workout_id
      AND (
          e.muscle_group ILIKE '%Legs%'
          OR e.muscle_group ILIKE '%Quad%'
          OR e.muscle_group ILIKE '%Hamstring%'
          OR e.muscle_group ILIKE '%Glute%'
          OR e.muscle_group ILIKE '%Calves%'
      );

    -- PRs broken in this workout session (updated within the workout window)
    SELECT COUNT(*) INTO v_pr_count
    FROM public.user_exercise_prs
    WHERE user_id = v_user_id
      AND updated_at >= v_workout.start_time
      AND updated_at <= COALESCE(v_workout.end_time, now());

    v_end_hour        := EXTRACT(HOUR FROM COALESCE(v_workout.end_time, now()) AT TIME ZONE 'UTC');
    v_duration_minutes := COALESCE(v_workout.duration, 0) / 60.0;

    -- INITIATION
    IF v_total_workouts = 1 THEN
        v_did_unlock := public.unlock_achievement(v_user_id, 'first_blood');
        IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["first_blood"]'::JSONB; END IF;
    END IF;

    -- GRIND: streak-based
    IF COALESCE(v_profile.current_streak, 0) >= 14 THEN
        v_did_unlock := public.unlock_achievement(v_user_id, 'habit_builder');
        IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["habit_builder"]'::JSONB; END IF;
    END IF;

    IF COALESCE(v_profile.current_streak, 0) >= 30 THEN
        v_did_unlock := public.unlock_achievement(v_user_id, 'iron_will');
        IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["iron_will"]'::JSONB; END IF;
    END IF;

    IF COALESCE(v_profile.current_streak, 0) >= 20 THEN
        v_did_unlock := public.unlock_achievement(v_user_id, 'unstoppable_force');
        IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["unstoppable_force"]'::JSONB; END IF;
    END IF;

    -- Saved by the Bell
    v_weekly_target := GREATEST(COALESCE(v_profile.yearly_workout_goal, 104)::NUMERIC / 52, 1);
    v_grace_hours   := ROUND((7.0 / v_weekly_target * 24) + 24, 1);
    IF v_profile.last_workout_date IS NOT NULL THEN
        v_hours_since := EXTRACT(EPOCH FROM (now() - v_profile.last_workout_date)) / 3600;
        IF v_hours_since >= (v_grace_hours - 12) AND v_hours_since < v_grace_hours THEN
            v_did_unlock := public.unlock_achievement(v_user_id, 'saved_by_bell');
            IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["saved_by_bell"]'::JSONB; END IF;
        END IF;
    END IF;

    -- HEAVY DUTY
    IF v_pr_count >= 3 THEN
        v_did_unlock := public.unlock_achievement(v_user_id, 'gravity_defier');
        IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["gravity_defier"]'::JSONB; END IF;
    END IF;

    IF COALESCE(v_workout.volume, 0) >= 1000 THEN
        v_did_unlock := public.unlock_achievement(v_user_id, 'one_ton_club');
        IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["one_ton_club"]'::JSONB; END IF;
    END IF;

    IF COALESCE(v_profile.lifetime_volume, 0) >= 1000000 THEN
        v_did_unlock := public.unlock_achievement(v_user_id, 'iron_titan');
        IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["iron_titan"]'::JSONB; END IF;
    END IF;

    IF v_total_sets >= 20 THEN
        v_did_unlock := public.unlock_achievement(v_user_id, 'pump_is_real');
        IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["pump_is_real"]'::JSONB; END IF;
    END IF;

    -- SECRET
    IF v_end_hour >= 0 AND v_end_hour < 3 THEN
        v_did_unlock := public.unlock_achievement(v_user_id, 'vampire');
        IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["vampire"]'::JSONB; END IF;
    END IF;

    IF v_total_legs >= 4 THEN
        v_did_unlock := public.unlock_achievement(v_user_id, 'never_skip_legs');
        IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["never_skip_legs"]'::JSONB; END IF;
    END IF;

    IF v_duration_minutes >= 150 THEN
        v_did_unlock := public.unlock_achievement(v_user_id, 'marathon_man');
        IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["marathon_man"]'::JSONB; END IF;
    END IF;

    RETURN v_newly_unlocked;
END;
$$;


GRANT EXECUTE ON FUNCTION public.check_achievements_for_workout(UUID) TO authenticated;

-- lifetime_volume on profiles (used for Iron Titan achievement)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS lifetime_volume NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Backfill from existing workouts
UPDATE public.profiles p
SET lifetime_volume = COALESCE((
    SELECT SUM(w.volume) FROM public.workouts w WHERE w.user_id = p.id
), 0);

-- Updated finish_workout_pipeline: adds lifetime_volume tracking + achievement check
CREATE OR REPLACE FUNCTION public.finish_workout_pipeline(
    p_workout_id    UUID,
    p_base_xp       INT DEFAULT 500
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id            UUID := auth.uid();
    v_streak_result      JSONB;
    v_ops_result         JSON;
    v_pr_result          JSONB;
    v_xp_result          JSONB;
    v_achievement_result JSONB;
    v_streak_multiplier  NUMERIC;
    v_total_xp           INT;
    v_bonus_xp           INT;
    v_workout_volume     NUMERIC;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    IF NOT EXISTS (SELECT 1 FROM public.workouts WHERE id = p_workout_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Workout % not found or not owned by caller', p_workout_id;
    END IF;

    SELECT COALESCE(volume, 0) INTO v_workout_volume FROM public.workouts WHERE id = p_workout_id;

    -- 1. Streak
    BEGIN
        SELECT public.update_streak_on_workout(p_workout_id) INTO v_streak_result;
    EXCEPTION WHEN OTHERS THEN
        v_streak_result := jsonb_build_object('current_streak',1,'longest_streak',1,'multiplier',1.0,'was_frozen',false,'grace_hours',108,'error',SQLERRM);
    END;

    -- 2. Missions
    BEGIN
        SELECT public.check_operations_progress(p_workout_id) INTO v_ops_result;
    EXCEPTION WHEN OTHERS THEN
        v_ops_result := json_build_object('success', false, 'error', SQLERRM);
    END;

    -- 3. PRs
    BEGIN
        SELECT public.evaluate_workout_prs(p_workout_id) INTO v_pr_result;
    EXCEPTION WHEN OTHERS THEN
        v_pr_result := '[]'::JSONB;
        RAISE WARNING 'evaluate_workout_prs failed: %', SQLERRM;
    END;

    -- 4. XP
    v_streak_multiplier := COALESCE((v_streak_result->>'multiplier')::NUMERIC, 1.0);
    IF (v_streak_result->>'was_frozen')::BOOLEAN THEN v_streak_multiplier := 1.0; END IF;

    v_total_xp := GREATEST(p_base_xp, 0);
    v_bonus_xp := CASE WHEN v_streak_multiplier > 1.0 THEN FLOOR(v_total_xp * (v_streak_multiplier - 1))::INT ELSE 0 END;
    v_total_xp := v_total_xp + v_bonus_xp;

    BEGIN
        SELECT public.increment_user_xp(v_total_xp) INTO v_xp_result;
    EXCEPTION WHEN OTHERS THEN
        v_xp_result := jsonb_build_object('error', SQLERRM, 'new_level', 1, 'did_level_up', false);
    END;

    -- 5. Lifetime volume
    BEGIN
        UPDATE public.profiles SET lifetime_volume = COALESCE(lifetime_volume,0) + v_workout_volume, updated_at = now() WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'lifetime_volume update failed: %', SQLERRM;
    END;

    -- 6. Achievements
    BEGIN
        SELECT public.check_achievements_for_workout(p_workout_id) INTO v_achievement_result;
    EXCEPTION WHEN OTHERS THEN
        v_achievement_result := '[]'::JSONB;
        RAISE WARNING 'check_achievements_for_workout failed: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'streak',           v_streak_result,
        'operations',       v_ops_result,
        'broken_prs',       COALESCE(v_pr_result, '[]'::JSONB),
        'xp',               v_xp_result,
        'base_xp',          p_base_xp,
        'bonus_xp',         v_bonus_xp,
        'total_xp',         v_total_xp,
        'new_achievements', COALESCE(v_achievement_result, '[]'::JSONB)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finish_workout_pipeline(UUID, INT) TO authenticated;
