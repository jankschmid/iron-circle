-- Scoped Feed RPC Fix (Ambiguous column resolution)
CREATE OR REPLACE FUNCTION get_squad_feed(p_limit INT DEFAULT 20, p_offset INT DEFAULT 0, p_scope TEXT DEFAULT 'squad')
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
#variable_conflict use_column
BEGIN
    RETURN QUERY
    WITH squad_users AS (
        SELECT f.friend_id AS uid FROM friendships f WHERE f.user_id = auth.uid() AND f.status = 'accepted'
        UNION
        SELECT f.user_id AS uid FROM friendships f WHERE f.friend_id = auth.uid() AND f.status = 'accepted'
        UNION 
        SELECT auth.uid() AS uid
    ),
    gym_users AS (
        SELECT ug.user_id AS uid 
        FROM user_gyms ug 
        WHERE p_scope = 'gym' 
        AND ug.gym_id = (SELECT ug2.gym_id FROM user_gyms ug2 WHERE ug2.user_id = auth.uid() LIMIT 1)
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
    WHERE (p_scope = 'squad' AND fe.user_id IN (SELECT uid FROM squad_users))
       OR (p_scope = 'gym' AND fe.user_id IN (SELECT uid FROM gym_users))
       OR (p_scope = 'global' AND fe.type IN ('pr', 'rank_up', 'challenge_won', 'challenge_verified'))
    ORDER BY fe.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
