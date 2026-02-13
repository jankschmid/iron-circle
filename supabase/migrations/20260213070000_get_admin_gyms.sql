-- Function to fetch paginated gyms with search and admin count
-- Needed for Master Admin Dashboard

DROP FUNCTION IF EXISTS get_admin_gyms_paginated(INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION get_admin_gyms_paginated(
  p_page_size INTEGER,
  p_page INTEGER,
  p_search TEXT DEFAULT ''
)
RETURNS TABLE (
  data JSON,
  total BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_gyms JSON;
BEGIN
  v_offset := p_page * p_page_size;

  -- 1. Get Total Count (filtering by name or address)
  SELECT COUNT(*) INTO v_total
  FROM gyms
  WHERE 
    p_search IS NULL OR p_search = '' OR
    name ILIKE '%' || p_search || '%' OR
    address ILIKE '%' || p_search || '%';

  -- 2. Get Gyms with Admin Count
  SELECT JSON_AGG(t) INTO v_gyms
  FROM (
    SELECT 
      g.*,
      (SELECT COUNT(*) FROM user_gyms ug WHERE ug.gym_id = g.id AND ug.role IN ('owner', 'admin')) as admin_count
    FROM gyms g
    WHERE 
        p_search IS NULL OR p_search = '' OR
        name ILIKE '%' || p_search || '%' OR
        address ILIKE '%' || p_search || '%'
    ORDER BY g.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset
  ) t;

  -- Return as single JSON object
  RETURN QUERY SELECT v_gyms as data, v_total as total;
END;
$$;
