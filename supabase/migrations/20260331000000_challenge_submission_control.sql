-- Add allow_multiple_submissions setting to gym_challenges
ALTER TABLE gym_challenges
  ADD COLUMN IF NOT EXISTS allow_multiple_submissions BOOLEAN DEFAULT false;

-- Add a column to challenge_submissions to track submission number per user
-- (useful for display, so we know "this is their 2nd submission" etc.)
ALTER TABLE challenge_submissions
  ADD COLUMN IF NOT EXISTS submission_number INTEGER DEFAULT 1;

-- Update RLS: authenticated users can also see all submissions for a challenge
-- (so the challenge card can show how many submissions there are)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'challenge_submissions' AND policyname = 'Users can view challenge submissions'
    ) THEN
        CREATE POLICY "Users can view challenge submissions" ON challenge_submissions
        FOR SELECT USING (
            -- User can see their own submissions
            auth.uid() = user_id
            OR
            -- Any participant can see all submissions for challenges they participate in
            EXISTS (
                SELECT 1 FROM challenge_participants cp
                WHERE cp.challenge_id = challenge_submissions.challenge_id
                AND cp.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Updated submit_challenge_result: enforces single submission when allow_multiple_submissions = false
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
  v_challenge gym_challenges%ROWTYPE;
  v_submission_id UUID;
  v_submission_count INTEGER;
BEGIN
  -- 1. Get challenge settings
  SELECT * INTO v_challenge FROM gym_challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Challenge not found');
  END IF;

  -- 2. Check if challenge is still active
  IF v_challenge.end_date IS NOT NULL AND v_challenge.end_date < NOW() THEN
    RETURN json_build_object('success', false, 'message', 'Challenge has ended');
  END IF;

  -- 3. Enforce single-submission rule
  SELECT COUNT(*) INTO v_submission_count
  FROM challenge_submissions
  WHERE challenge_id = p_challenge_id AND user_id = auth.uid();

  IF NOT v_challenge.allow_multiple_submissions AND v_submission_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You have already submitted a result for this challenge',
      'already_submitted', true
    );
  END IF;

  -- 4. Insert submission
  INSERT INTO challenge_submissions (challenge_id, user_id, value, proof_url, note, submission_number)
  VALUES (p_challenge_id, auth.uid(), p_value, p_proof_url, p_note, v_submission_count + 1)
  RETURNING id INTO v_submission_id;

  -- 5. Auto-update participant progress
  -- For multiple submissions: add to running total
  -- For single submission: set to the submitted value
  UPDATE challenge_participants
  SET progress = CASE
        WHEN v_challenge.allow_multiple_submissions THEN COALESCE(progress, 0) + p_value
        ELSE p_value
      END,
      last_updated = NOW()
  WHERE challenge_id = p_challenge_id AND user_id = auth.uid();

  RETURN json_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'submission_number', v_submission_count + 1
  );
END;
$$;
