-- ============================================================
-- Streak System: Dynamic Grace Period, Freeze Mode, XP Multiplier
-- ============================================================

-- Step 1: Add missing columns to profiles
-- (current_streak already exists from prior migration)
-- ============================================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS longest_streak     INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_workout_date  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS streak_status      TEXT        NOT NULL DEFAULT 'active'
                                                CHECK (streak_status IN ('active', 'frozen')),
    ADD COLUMN IF NOT EXISTS frozen_until       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS frozen_reason      TEXT,
    ADD COLUMN IF NOT EXISTS yearly_workout_goal INTEGER    NOT NULL DEFAULT 104;
    -- Default: 2 workouts/week × 52 weeks = 104 (moderate goal)

-- ============================================================
-- RPC 1: toggle_streak_freeze(p_reason TEXT, p_days INT)
--
-- Sets the user's streak to 'frozen' for p_days days.
-- Consecutive calls extend the freeze window (don't shorten).
-- Calling with p_days = 0 immediately unfreezes.
-- ============================================================
CREATE OR REPLACE FUNCTION public.toggle_streak_freeze(
    p_reason TEXT DEFAULT 'Vacation/Sick',
    p_days   INT  DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_until   TIMESTAMPTZ;
    v_status  TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_days <= 0 THEN
        -- Immediate unfreeze
        UPDATE public.profiles
        SET streak_status = 'active',
            frozen_until  = NULL,
            frozen_reason = NULL,
            updated_at    = now()
        WHERE id = v_user_id;

        RETURN jsonb_build_object('status', 'active', 'frozen_until', NULL);
    ELSE
        v_until  := now() + (p_days || ' days')::INTERVAL;
        v_status := 'frozen';

        UPDATE public.profiles
        SET streak_status = v_status,
            frozen_until  = v_until,
            frozen_reason = p_reason,
            updated_at    = now()
        WHERE id = v_user_id;

        RETURN jsonb_build_object(
            'status',       v_status,
            'frozen_until', v_until,
            'reason',       p_reason
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_streak_freeze(TEXT, INT) TO authenticated;


-- ============================================================
-- RPC 2: update_streak_on_workout(p_workout_id UUID)
--
-- Called immediately after a workout is inserted.
-- 1. Reads yearly_workout_goal to calculate Grace Period:
--      W = yearly_goal / 52
--      grace_hours = (7 / W * 24) + 24
-- 2. If streak_status = 'frozen' AND frozen_until > now():
--      - Do NOT break or increment streak
--      - Auto-unfreeze: set status back to 'active'
--      - Return multiplier = 0 (no bonus while frozen)
-- 3. If hours since last_workout_date <= grace_hours:
--      - Increment current_streak
-- 4. Else:
--      - Reset current_streak to 1
-- 5. Update longest_streak if current > longest
-- 6. Compute XP multiplier tier:
--      1-4   → 1.00x
--      5-9   → 1.10x
--      10-19 → 1.25x
--      20+   → 1.50x
-- 7. Returns { current_streak, longest_streak, multiplier,
--              was_frozen, grace_hours }
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_streak_on_workout(p_workout_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id        UUID := auth.uid();
    v_profile        RECORD;
    v_hours_since    NUMERIC;
    v_weekly_target  NUMERIC;
    v_grace_hours    NUMERIC;
    v_new_streak     INTEGER;
    v_longest        INTEGER;
    v_multiplier     NUMERIC(4,2);
    v_was_frozen     BOOLEAN := FALSE;
    v_now            TIMESTAMPTZ := now();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate workout ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.workouts
        WHERE id = p_workout_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Workout not found or not owned by caller';
    END IF;

    -- Fetch current profile state
    SELECT  current_streak,
            longest_streak,
            last_workout_date,
            streak_status,
            frozen_until,
            COALESCE(yearly_workout_goal, 104) AS yearly_workout_goal
    INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    -- --------------------------------------------------------
    -- Dynamic Grace Period Calculation
    -- W = yearly_goal / 52   (workouts per week)
    -- grace_hours = (7 / W * 24) + 24   (avg rest days + 24h buffer)
    -- Example: 104/year → W=2 → grace = 84+24 = 108h (4.5 days)
    -- Example: 260/year → W=5 → grace = 33.6+24 = 57.6h (2.4 days)
    -- --------------------------------------------------------
    v_weekly_target := GREATEST(v_profile.yearly_workout_goal::NUMERIC / 52, 1);
    v_grace_hours   := ROUND((7.0 / v_weekly_target * 24) + 24, 1);

    -- --------------------------------------------------------
    -- FREEZE CHECK
    -- --------------------------------------------------------
    IF v_profile.streak_status = 'frozen' AND v_profile.frozen_until > v_now THEN
        -- Frozen and still within window → don't break streak, don't increment
        v_was_frozen := TRUE;
        v_new_streak := COALESCE(v_profile.current_streak, 1);
        v_longest    := GREATEST(COALESCE(v_profile.longest_streak, 0), v_new_streak);
        v_multiplier := 0.00;  -- No XP bonus while frozen

        -- Auto-unfreeze: logging a workout ends the freeze
        UPDATE public.profiles
        SET streak_status   = 'active',
            frozen_until    = NULL,
            frozen_reason   = NULL,
            current_streak  = v_new_streak,
            longest_streak  = v_longest,
            last_workout_date = v_now,
            updated_at      = v_now
        WHERE id = v_user_id;

        RETURN jsonb_build_object(
            'current_streak', v_new_streak,
            'longest_streak', v_longest,
            'multiplier',     v_multiplier,
            'was_frozen',     v_was_frozen,
            'grace_hours',    v_grace_hours,
            'streak_broken',  FALSE
        );
    END IF;

    -- --------------------------------------------------------
    -- STREAK LOGIC (not frozen, or freeze expired)
    -- --------------------------------------------------------

    -- Auto-clear expired freeze status
    IF v_profile.streak_status = 'frozen' AND
       (v_profile.frozen_until IS NULL OR v_profile.frozen_until <= v_now) THEN
        -- Freeze expired naturally — treat as active, apply grace normally
        NULL; -- will be cleared in the UPDATE below
    END IF;

    -- Hours since last workout
    IF v_profile.last_workout_date IS NULL THEN
        v_hours_since := 0;   -- First ever workout — always counts
    ELSE
        v_hours_since := EXTRACT(EPOCH FROM (v_now - v_profile.last_workout_date)) / 3600;
    END IF;

    -- Streak increment or reset
    IF v_hours_since <= v_grace_hours OR v_profile.last_workout_date IS NULL THEN
        v_new_streak := COALESCE(v_profile.current_streak, 0) + 1;
    ELSE
        v_new_streak := 1;  -- Streak broken, reset to 1 (this workout counts)
    END IF;

    v_longest := GREATEST(COALESCE(v_profile.longest_streak, 0), v_new_streak);

    -- --------------------------------------------------------
    -- XP MULTIPLIER TIERS
    -- --------------------------------------------------------
    IF    v_new_streak >= 20 THEN v_multiplier := 1.50;
    ELSIF v_new_streak >= 10 THEN v_multiplier := 1.25;
    ELSIF v_new_streak >= 5  THEN v_multiplier := 1.10;
    ELSE                          v_multiplier := 1.00;
    END IF;

    -- --------------------------------------------------------
    -- Persist updated streak to profile
    -- --------------------------------------------------------
    UPDATE public.profiles
    SET current_streak    = v_new_streak,
        longest_streak    = v_longest,
        last_workout_date = v_now,
        streak_status     = 'active',
        frozen_until      = NULL,
        frozen_reason     = NULL,
        updated_at        = v_now
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'current_streak',  v_new_streak,
        'longest_streak',  v_longest,
        'multiplier',      v_multiplier,
        'was_frozen',      v_was_frozen,
        'grace_hours',     v_grace_hours,
        'streak_broken',   (v_new_streak = 1 AND v_profile.last_workout_date IS NOT NULL
                            AND v_hours_since > v_grace_hours)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_streak_on_workout(UUID) TO authenticated;
