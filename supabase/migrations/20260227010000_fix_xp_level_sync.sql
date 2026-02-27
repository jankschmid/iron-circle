-- ============================================================
-- Fix: increment_user_xp — also recalculates and persists level
-- ============================================================
-- Root cause: the old version updated current_xp / lifetime_xp
-- but never updated the `level` column. Profile pages read `level`
-- directly from the DB, so the level appeared frozen even though
-- XP was being credited correctly. This migration rewrites the RPC
-- to mirror the JS arithmetic-progression formula exactly.
--
-- Level progression (same as gamification.js):
--   L1  → 0 XP (start)
--   L2  → 500 XP (diff = 500)
--   L3  → 1100 XP (diff = 600)
--   Diff(L→L+1) = 400 + L*100
--   Max Level = 1000
-- ============================================================

-- Drop old void version first — PostgreSQL won't allow changing return type via CREATE OR REPLACE
DROP FUNCTION IF EXISTS public.increment_user_xp(INT);

CREATE OR REPLACE FUNCTION public.increment_user_xp(amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id       UUID := auth.uid();
    v_current_xp    INT;
    v_lifetime_xp   INT;
    v_old_level     INT;
    v_new_xp        INT;
    v_new_level     INT := 1;
    v_required      INT := 500;   -- XP needed for L1→L2
    v_accumulated   INT := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Fetch current values
    SELECT
        COALESCE(current_xp, 0),
        COALESCE(lifetime_xp, 0),
        COALESCE(level, 1)
    INTO v_current_xp, v_lifetime_xp, v_old_level
    FROM public.profiles
    WHERE id = v_user_id;

    -- Increment XP (floor at 0)
    v_new_xp      := GREATEST(0, v_current_xp + amount);
    v_lifetime_xp := GREATEST(0, v_lifetime_xp + amount);

    -- Recalculate level from current_xp using the AP formula
    -- (matches gamification.js calculateLevel exactly)
    WHILE v_new_xp >= v_accumulated + v_required AND v_new_level < 1000 LOOP
        v_accumulated := v_accumulated + v_required;
        v_new_level   := v_new_level + 1;
        v_required    := v_required + 100;
    END LOOP;

    -- Persist
    UPDATE public.profiles
    SET current_xp   = v_new_xp,
        lifetime_xp  = v_lifetime_xp,
        level        = v_new_level,
        updated_at   = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'new_xp',       v_new_xp,
        'new_level',    v_new_level,
        'did_level_up', v_new_level > v_old_level,
        'old_level',    v_old_level
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_user_xp(INT) TO authenticated;
