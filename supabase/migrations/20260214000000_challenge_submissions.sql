-- Challenge Submissions Table
CREATE TABLE IF NOT EXISTS challenge_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES gym_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  proof_url TEXT,
  note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;

-- Users can see their own submissions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'challenge_submissions' AND policyname = 'Users can view own submissions'
    ) THEN
        CREATE POLICY "Users can view own submissions" ON challenge_submissions
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Gym Staff can see submissions for their gym's challenges
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'challenge_submissions' AND policyname = 'Staff can view submissions'
    ) THEN
        CREATE POLICY "Staff can view submissions" ON challenge_submissions
        FOR SELECT USING (
            EXISTS (
            SELECT 1 FROM gym_challenges gc
            JOIN user_gyms ug ON ug.gym_id = gc.gym_id
            WHERE gc.id = challenge_submissions.challenge_id
            AND ug.user_id = auth.uid()
            AND ug.role IN ('owner', 'admin', 'trainer')
            )
        );
    END IF;
END $$;

-- Function to Submit Result
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
  INSERT INTO challenge_submissions (challenge_id, user_id, value, proof_url, note)
  VALUES (p_challenge_id, auth.uid(), p_value, p_proof_url, p_note)
  RETURNING id INTO v_submission_id;

  RETURN json_build_object('success', true, 'submission_id', v_submission_id);
END;
$$;

-- Function to Verify Submission
CREATE OR REPLACE FUNCTION verify_submission(
  p_submission_id UUID,
  p_status TEXT -- 'verified' or 'rejected'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission challenge_submissions%ROWTYPE;
  v_challenge gym_challenges%ROWTYPE;
  v_participant challenge_participants%ROWTYPE;
BEGIN
  -- 1. Get Submission
  SELECT * INTO v_submission FROM challenge_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Submission not found'); END IF;

  -- 2. Check Permissions (Must be staff)
  IF NOT EXISTS (
    SELECT 1 FROM gym_challenges gc
    JOIN user_gyms ug ON ug.gym_id = gc.gym_id
    WHERE gc.id = v_submission.challenge_id
    AND ug.user_id = auth.uid()
    AND ug.role IN ('owner', 'admin', 'trainer')
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- 3. Update Submission Status
  UPDATE challenge_submissions
  SET status = p_status, verified_at = NOW(), verified_by = auth.uid()
  WHERE id = p_submission_id;

  -- 4. If Verified, update User Progress
  IF p_status = 'verified' THEN
    -- Get Challenge details to know type (volume, reps, etc - though for now we just ADD)
    -- Actually, if it's a "Max Weight" challenge, we might want to take the MAX.
    -- For now, simple logic: ADD value to progress.
    -- TODO: Refine based on challenge_type if needed.
    
    UPDATE challenge_participants
    SET progress = COALESCE(progress, 0) + v_submission.value,
        last_updated = NOW()
    WHERE challenge_id = v_submission.challenge_id AND user_id = v_submission.user_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;


-- MASTER ADMIN FIX: Re-apply get_admin_gyms_paginated
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

  -- 1. Get Total Count
  SELECT COUNT(*) INTO v_total
  FROM gyms
  WHERE 
    p_search IS NULL OR p_search = '' OR
    name ILIKE '%' || p_search || '%' OR
    address ILIKE '%' || p_search || '%';

  -- 2. Get Gyms
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

  RETURN QUERY SELECT v_gyms as data, v_total as total;
END;
$$;
