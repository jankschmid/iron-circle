-- hybrid_challenge_system.sql
-- Migration 20260310000000_challenge_planner.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enum/Domain or Check Constraint for team_type
-- We use a check constraint for simplicity instead of a custom type, as it's easier to manage in Supabase.

-- 2. Alter gym_challenges table
ALTER TABLE gym_challenges 
ADD COLUMN IF NOT EXISTS team_type TEXT DEFAULT 'none' CHECK (team_type IN ('none', 'admin_defined', 'squad_based', 'open_creation')),
ADD COLUMN IF NOT EXISTS xp_reward_1st INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS xp_reward_2nd INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS xp_reward_3rd INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS xp_reward_participation INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS publish_at TIMESTAMP WITH TIME ZONE;

-- We don't need 'status' column anymore because we'll compute it dynamically.
-- Let's drop the 'is_active' or existing 'status' if we were going to add it, but currently it just has start_date and end_date.

-- 3. Create challenge_teams table for 'open_creation' and 'admin_defined' teams
CREATE TABLE IF NOT EXISTS challenge_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES gym_challenges(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if admin created
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for challenge_teams
ALTER TABLE challenge_teams ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'challenge_teams' AND policyname = 'Public read challenge teams'
    ) THEN
        CREATE POLICY "Public read challenge teams" ON challenge_teams FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'challenge_teams' AND policyname = 'Authenticated users can create teams for open challenges'
    ) THEN
        CREATE POLICY "Authenticated users can create teams for open challenges" ON challenge_teams FOR INSERT WITH CHECK (
            auth.role() = 'authenticated' AND
            EXISTS (
                SELECT 1 FROM gym_challenges gc 
                WHERE gc.id = challenge_id 
                AND gc.team_type = 'open_creation'
            )
        );
    END IF;
END $$;

-- Admins can also manage teams (needed for 'admin_defined' mode)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'challenge_teams' AND policyname = 'Gym Admins can manage challenge teams'
    ) THEN
        CREATE POLICY "Gym Admins can manage challenge teams" ON challenge_teams FOR ALL USING (
            EXISTS (
                SELECT 1 FROM gym_challenges gc
                JOIN gyms g ON gc.gym_id = g.id
                WHERE gc.id = challenge_teams.challenge_id AND g.created_by = auth.uid()
            )
        );
    END IF;
END $$;


-- 4. Alter challenge_participants to support teams and squads
ALTER TABLE challenge_participants
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES challenge_teams(id) ON DELETE SET NULL;

-- 5. Dynamic Status View or Computed RPC
-- Instead of a VIEW which can be tricky with PostgREST sometimes if not explicitly defined with security invoker,
-- we'll create a simple plpgsql function that returns the computed status context so the frontend can query it easily,
-- OR we can just create a SQL VIEW that attaches the computed status.

-- Let's create a View over gym_challenges that includes the computed status
-- 'Draft' = not published
-- 'Upcoming' = published but start_date > NOW()
-- 'Active' = published and NOW() between start_date and end_date
-- 'Completed' = published and end_date < NOW()

CREATE OR REPLACE VIEW v_gym_challenges WITH (security_invoker=on) AS
SELECT 
    *,
    CASE 
        WHEN NOT is_published THEN 'Draft'
        WHEN publish_at IS NOT NULL AND publish_at > NOW() THEN 'Draft'
        WHEN start_date > NOW() THEN 'Upcoming'
        WHEN (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()) THEN 'Active'
        WHEN end_date < NOW() THEN 'Completed'
        ELSE 'Unknown'
    END as computed_status
FROM gym_challenges;

-- Need to grant select on view
GRANT SELECT ON v_gym_challenges TO authenticated, anon;

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
