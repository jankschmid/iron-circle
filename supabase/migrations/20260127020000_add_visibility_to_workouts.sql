-- Add visibility column
ALTER TABLE "public"."workouts" ADD COLUMN IF NOT EXISTS "visibility" text CHECK (visibility IN ('public', 'private', 'friends')) DEFAULT 'public';

-- Drop potential conflicting policies from manual runs
DROP POLICY IF EXISTS "Users can view public workouts" ON "public"."workouts";

-- Policy: Everyone can view public workouts (Own workouts covered by existing policy)
CREATE POLICY "Users can view public workouts"
ON "public"."workouts" FOR SELECT
USING (visibility = 'public');

-- Note: 'private' workouts are only visible to owner (via existing own-policy)
-- 'friends' visibility is effectively private for now until we add a specific friend-policy
