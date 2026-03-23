-- Fix logic for the_architect achievement: checks workout_templates, not workout_plans
CREATE OR REPLACE FUNCTION public.check_event_achievements(p_event_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id        UUID := auth.uid();
    v_profile        RECORD;
    v_templates      INT;
    v_friends        INT;
    v_hypes          INT;
    v_newly_unlocked JSONB := '[]'::JSONB;
    v_did_unlock     BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN RETURN '[]'::JSONB; END IF;

    -- EVENT: PROFILE_UPDATED
    IF p_event_type = 'PROFILE_UPDATED' THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
        IF FOUND AND v_profile.setup_completed = true AND v_profile.avatar_url IS NOT NULL AND v_profile.avatar_url != '' THEN
            v_did_unlock := public.unlock_achievement(v_user_id, 'profile_polished');
            IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["profile_polished"]'::JSONB; END IF;
        END IF;
    END IF;

    -- EVENT: TEMPLATE_CREATION (Fixed to workout_templates)
    IF p_event_type = 'TEMPLATE_CREATION' THEN
        SELECT COUNT(*) INTO v_templates FROM public.workout_templates WHERE user_id = v_user_id;
        IF v_templates >= 1 THEN
            v_did_unlock := public.unlock_achievement(v_user_id, 'the_architect');
            IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["the_architect"]'::JSONB; END IF;
        END IF;
    END IF;

    -- EVENT: FRIEND_ADDED
    IF p_event_type = 'FRIEND_ADDED' THEN
        SELECT COUNT(*) INTO v_friends FROM public.social_friends 
        WHERE (user_id = v_user_id OR friend_id = v_user_id) AND status = 'ACCEPTED';
        IF v_friends >= 3 THEN
            v_did_unlock := public.unlock_achievement(v_user_id, 'wolfpack');
            IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["wolfpack"]'::JSONB; END IF;
        END IF;
    END IF;

    -- EVENT: HYPE_SENT
    IF p_event_type = 'HYPE_SENT' THEN
        SELECT COUNT(*) INTO v_hypes FROM public.social_interactions
        WHERE user_id = v_user_id AND interaction_type = 'hype';
        IF v_hypes >= 1 THEN
            v_did_unlock := public.unlock_achievement(v_user_id, 'hype_machine');
            IF v_did_unlock THEN v_newly_unlocked := v_newly_unlocked || '["hype_machine"]'::JSONB; END IF;
        END IF;
    END IF;

    RETURN v_newly_unlocked;
END;
$$;
