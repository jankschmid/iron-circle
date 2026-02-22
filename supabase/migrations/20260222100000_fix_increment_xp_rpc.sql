CREATE OR REPLACE FUNCTION increment_user_xp(amount INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_xp INT;
  v_lifetime_xp INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current values
  SELECT COALESCE(current_xp, 0), COALESCE(lifetime_xp, 0)
  INTO v_current_xp, v_lifetime_xp
  FROM profiles
  WHERE id = v_user_id;

  -- Ensure we don't drop below 0
  v_current_xp := GREATEST(0, v_current_xp + amount);
  v_lifetime_xp := GREATEST(0, v_lifetime_xp + amount);

  -- Update profile
  UPDATE profiles
  SET current_xp = v_current_xp,
      lifetime_xp = v_lifetime_xp,
      updated_at = now()
  WHERE id = v_user_id;

END;
$$;
