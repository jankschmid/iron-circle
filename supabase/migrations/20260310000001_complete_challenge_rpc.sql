-- 6. RPC: Complete Challenge & Award XP
-- This function can be called by an Admin to officially end a challenge and distribute the XP.
CREATE OR REPLACE FUNCTION complete_challenge_and_award_xp(p_challenge_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge gym_challenges%ROWTYPE;
    v_participant RECORD;
    v_xp_to_award INT;
    v_rank INT := 1;
BEGIN
    -- 1. Get Challenge Details
    SELECT * INTO v_challenge FROM gym_challenges WHERE id = p_challenge_id;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Challenge not found'); END IF;

    -- 2. Verify Admin/Owner Access
    IF NOT EXISTS (
        SELECT 1 FROM user_gyms ug WHERE ug.gym_id = v_challenge.gym_id AND ug.user_id = auth.uid() AND ug.role IN ('admin', 'owner')
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- 3. Loop through participants ordered by progress descending
    FOR v_participant IN 
        SELECT user_id, progress FROM challenge_participants 
        WHERE challenge_id = p_challenge_id AND progress > 0
        ORDER BY progress DESC
    LOOP
        -- Determine XP based on rank
        IF v_rank = 1 THEN
            v_xp_to_award := v_challenge.xp_reward_1st;
        ELSIF v_rank = 2 THEN
            v_xp_to_award := v_challenge.xp_reward_2nd;
        ELSIF v_rank = 3 THEN
            v_xp_to_award := v_challenge.xp_reward_3rd;
        ELSE
            v_xp_to_award := v_challenge.xp_reward_participation;
        END IF;

        -- Award XP if > 0
        IF v_xp_to_award > 0 THEN
            -- Update user profile XP (assuming users or profiles has an xp column, or gamification table)
            -- We'll use the rpc add_xp function or direct update if applicable
            UPDATE gamification SET current_level_xp = current_level_xp + v_xp_to_award WHERE user_id = v_participant.user_id;
        END IF;

        v_rank := v_rank + 1;
    END LOOP;

    -- 4. Automatically set end date to NOW() so it moves to 'Completed' status
    UPDATE gym_challenges SET end_date = NOW() WHERE id = p_challenge_id;

    RETURN json_build_object('success', true, 'message', 'Challenge completed and XP awarded to ' || (v_rank - 1) || ' participants.');
END;
$$;
