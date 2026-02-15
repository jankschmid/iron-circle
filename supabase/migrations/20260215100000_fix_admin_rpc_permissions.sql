-- Grant execute permissions to authenticated users for the admin dashboard RPC
GRANT EXECUTE ON FUNCTION get_admin_gyms_paginated(integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_gyms_paginated(integer, integer, text) TO service_role;

-- Ensure search_path is set for security definer
ALTER FUNCTION get_admin_gyms_paginated(integer, integer, text) SET search_path = public;
