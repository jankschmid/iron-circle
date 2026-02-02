-- Secure RPC to allow a user to delete their own account
-- This removes the user from auth.users, effectively revoking access immediately.

CREATE OR REPLACE FUNCTION delete_own_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from auth.users (Cascades to profiles usually, but we doing manual cleanup too just in case)
  -- Note: We must ensure we only delete the calling user.
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;
