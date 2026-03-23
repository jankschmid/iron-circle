-- Add last_updated if missing
ALTER TABLE challenge_participants ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- Function to Submit Result and automatically verify it
CREATE OR REPLACE FUNCTION submit_challenge_result(
  p_challenge_id UUID,
  p_value NUMERIC,
  p_proof_url TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission_id UUID;
BEGIN
  -- Insert as verified directly
  INSERT INTO challenge_submissions (challenge_id, user_id, value, proof_url, note, status, verified_at, verified_by)
  VALUES (p_challenge_id, auth.uid(), p_value, p_proof_url, p_note, 'verified', NOW(), auth.uid())
  RETURNING id INTO v_submission_id;

  -- Automatically update participant progress
  UPDATE challenge_participants
  SET progress = COALESCE(progress, 0) + p_value,
      last_updated = NOW()
  WHERE challenge_id = p_challenge_id AND user_id = auth.uid();

  RETURN json_build_object('success', true, 'submission_id', v_submission_id);
END;
$$;
