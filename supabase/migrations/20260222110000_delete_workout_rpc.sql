CREATE OR REPLACE FUNCTION delete_workout_data(p_workout_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_workout_user UUID;
    v_duration INT;
    v_volume NUMERIC;
    v_xp_to_deduct INT := 0;
    v_current_xp INT;
    v_lifetime_xp INT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;

    -- 1. Get Workout Info
    SELECT user_id, duration, volume 
    INTO v_workout_user, v_duration, v_volume
    FROM workouts 
    WHERE id = p_workout_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Workout not found');
    END IF;

    IF v_workout_user != v_user_id THEN
        RETURN json_build_object('success', false, 'message', 'Not authorized');
    END IF;

    -- 2. Calculate XP to deduct using the simplistic model:
    -- Every 60s of duration = 1 XP
    -- Every 100kg of volume = 1 XP
    -- Plus ~15 base XP (we will approximate 15)
    v_xp_to_deduct := COALESCE((v_duration / 60), 0) + COALESCE((v_volume / 100), 0) + 15;

    -- 3. Delete Workout (cascades to workout_logs)
    DELETE FROM workouts WHERE id = p_workout_id;

    -- 4. Deduct XP Safely
    SELECT COALESCE(current_xp, 0), COALESCE(lifetime_xp, 0)
    INTO v_current_xp, v_lifetime_xp
    FROM profiles
    WHERE id = v_user_id;

    UPDATE profiles
    SET current_xp = GREATEST(0, v_current_xp - v_xp_to_deduct),
        lifetime_xp = GREATEST(0, v_lifetime_xp - v_xp_to_deduct)
    WHERE id = v_user_id;

    RETURN json_build_object('success', true, 'xp_deducted', v_xp_to_deduct);
END;
$$;
