-- PHASE 4: SOCIAL & COMMUNITY FEATURES

-- 1. FEED EVENTS
CREATE TABLE IF NOT EXISTS feed_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('workout', 'pr', 'rank_up', 'friend')),
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can see their own events and their friends' events
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feed events" ON feed_events;
CREATE POLICY "Users can view own feed events"
ON feed_events FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create system events (Server Side or Trigger)" ON feed_events;
CREATE POLICY "Users can create system events (Server Side or Trigger)" 
ON feed_events FOR INSERT 
WITH CHECK (auth.uid() = user_id); 
-- In practice, many events will be created via database triggers or server functions, 
-- but client-side creation for some types might be needed.

-- 2. FEED INTERACTIONS (Fistbumps/Comments)
CREATE TABLE IF NOT EXISTS feed_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_event_id UUID NOT NULL REFERENCES feed_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('fistbump', 'comment')),
    content TEXT, -- Null for fistbumps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(feed_event_id, user_id, type) -- One fistbump per person per event
);

ALTER TABLE feed_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view for interactions" ON feed_interactions;
CREATE POLICY "Public view for interactions" 
ON feed_interactions FOR SELECT 
USING (true); -- Optimize later if needed, but interactions are generally visible if the event is visible

DROP POLICY IF EXISTS "Users can add interactions" ON feed_interactions;
CREATE POLICY "Users can add interactions" 
ON feed_interactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own interactions" ON feed_interactions;
CREATE POLICY "Users can delete own interactions" 
ON feed_interactions FOR DELETE 
USING (auth.uid() = user_id);


-- 3. COMMUNITY GOALS (Team Goals)
CREATE TABLE IF NOT EXISTS community_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    metric TEXT NOT NULL CHECK (metric IN ('VOLUME', 'WORKOUTS', 'DISTANCE')),
    target_value BIGINT NOT NULL,
    current_value BIGINT DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'EXPIRED')),
    xp_reward INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE community_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view goals" ON community_goals;
CREATE POLICY "Members can view goals" 
ON community_goals FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM community_members cm 
        WHERE cm.community_id = community_goals.community_id 
        AND cm.user_id = auth.uid()
    )
);

-- 4. GOAL CONTRIBUTIONS
CREATE TABLE IF NOT EXISTS goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES community_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contribution_amount BIGINT DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(goal_id, user_id)
);

ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view contributions" ON goal_contributions;
CREATE POLICY "Members can view contributions" 
ON goal_contributions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM community_goals cg
        JOIN community_members cm ON cm.community_id = cg.community_id
        WHERE cg.id = goal_contributions.goal_id
        AND cm.user_id = auth.uid()
    )
);

-- 5. RPC: GET SQUAD FEED
-- Returns events for self and accepted friends, paginated
CREATE OR REPLACE FUNCTION get_squad_feed(p_limit INT DEFAULT 20, p_offset INT DEFAULT 0)
RETURNS TABLE (
    event_id UUID,
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    type TEXT,
    data JSONB,
    created_at TIMESTAMPTZ,
    fistbump_count BIGINT,
    has_fistbumped BOOLEAN,
    comment_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH friend_ids AS (
        SELECT f.friend_id AS uid FROM friendships f WHERE f.user_id = auth.uid() AND f.status = 'accepted'
        UNION
        SELECT f.user_id AS uid FROM friendships f WHERE f.friend_id = auth.uid() AND f.status = 'accepted'
        UNION
        SELECT auth.uid() AS uid -- Include self
    )
    SELECT 
        fe.id AS event_id,
        fe.user_id,
        p.username,
        p.avatar_url,
        fe.type,
        fe.data,
        fe.created_at,
        (SELECT COUNT(*) FROM feed_interactions fi WHERE fi.feed_event_id = fe.id AND fi.type = 'fistbump') AS fistbump_count,
        (EXISTS (SELECT 1 FROM feed_interactions fi WHERE fi.feed_event_id = fe.id AND fi.type = 'fistbump' AND fi.user_id = auth.uid())) AS has_fistbumped,
        (SELECT COUNT(*) FROM feed_interactions fi WHERE fi.feed_event_id = fe.id AND fi.type = 'comment') AS comment_count
    FROM feed_events fe
    JOIN profiles p ON p.id = fe.user_id
    WHERE fe.user_id IN (SELECT uid FROM friend_ids)
    ORDER BY fe.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. RPC: CONTRIBUTE TO GOAL (Secure Increment)
-- securely increments goal value and user contribution
CREATE OR REPLACE FUNCTION contribute_to_goal(p_goal_id UUID, p_amount BIGINT)
RETURNS VOID AS $$
DECLARE
    v_community_id UUID;
    v_status TEXT;
BEGIN
    -- Check if goal exists and is active
    SELECT community_id, status INTO v_community_id, v_status FROM community_goals WHERE id = p_goal_id;
    
    IF v_status <> 'ACTIVE' THEN
        RETURN; -- Do nothing if not active
    END IF;

    -- Check if user is member of community
    IF NOT EXISTS (SELECT 1 FROM community_members WHERE community_id = v_community_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'User not a member of this community';
    END IF;

    -- Update Goal Totals
    UPDATE community_goals 
    SET current_value = current_value + p_amount 
    WHERE id = p_goal_id;

    -- Upsert User Contribution
    INSERT INTO goal_contributions (goal_id, user_id, contribution_amount, last_updated)
    VALUES (p_goal_id, auth.uid(), p_amount, NOW())
    ON CONFLICT (goal_id, user_id) 
    DO UPDATE SET 
        contribution_amount = goal_contributions.contribution_amount + EXCLUDED.contribution_amount,
        last_updated = NOW();
        
    -- Check for completion (Simple trigger check could also do this, but simple inline here)
    UPDATE community_goals
    SET status = 'COMPLETED'
    WHERE id = p_goal_id 
    AND current_value >= target_value 
    AND status = 'ACTIVE';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
