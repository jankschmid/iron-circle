-- Migration: Master Admin Pagination RPC

CREATE OR REPLACE FUNCTION get_admin_gyms_paginated(
    p_page_size INT DEFAULT 12,
    p_page INT DEFAULT 0,
    p_search TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offset INT;
    v_total BIGINT;
    v_data JSONB;
BEGIN
    v_offset := p_page * p_page_size;

    -- 1. Get Total Count
    SELECT COUNT(*) INTO v_total
    FROM gyms
    WHERE 
        name ILIKE '%' || p_search || '%' OR
        address ILIKE '%' || p_search || '%' OR
        location ILIKE '%' || p_search || '%';

    -- 2. Get Data
    SELECT jsonb_agg(dataset) INTO v_data
    FROM (
        SELECT 
            g.id,
            g.name,
            g.address,
            g.location,
            g.is_verified,
            (SELECT COUNT(*) FROM user_gyms ug WHERE ug.gym_id = g.id AND ug.role IN ('admin', 'owner')) as admin_count,
            (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id IN (SELECT id FROM communities WHERE gym_id = g.id)) as member_count,
            g.created_at
        FROM gyms g
        WHERE 
            g.name ILIKE '%' || p_search || '%' OR
            g.address ILIKE '%' || p_search || '%' OR
            g.location ILIKE '%' || p_search || '%'
        ORDER BY g.created_at DESC
        LIMIT p_page_size
        OFFSET v_offset
    ) as dataset;

    RETURN jsonb_build_object(
        'data', COALESCE(v_data, '[]'::jsonb),
        'total', v_total,
        'page', p_page,
        'size', p_page_size
    );
END;
$$;
