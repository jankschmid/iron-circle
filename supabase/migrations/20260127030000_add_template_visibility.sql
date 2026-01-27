-- Add visibility column to workout_templates
ALTER TABLE "public"."workout_templates" ADD COLUMN IF NOT EXISTS "visibility" text CHECK (visibility IN ('public', 'private', 'friends')) DEFAULT 'public';

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own templates" ON "public"."workout_templates";
DROP POLICY IF EXISTS "Public templates are viewable" ON "public"."workout_templates";

-- 1. VIEW Own Templates
CREATE POLICY "Users can view own templates" 
ON "public"."workout_templates" FOR SELECT 
USING (auth.uid() = user_id);

-- 2. VIEW Friends' Templates (Only if Public/Friends visibility)
CREATE POLICY "Friends can view templates"
ON "public"."workout_templates" FOR SELECT
USING (
    visibility != 'private' AND 
    EXISTS (
        SELECT 1 FROM friendships 
        WHERE status = 'accepted'
        AND (
            (user_id = auth.uid() AND friend_id = workout_templates.user_id)
            OR
            (friend_id = auth.uid() AND user_id = workout_templates.user_id)
        )
    )
);

-- 3. INSERT/UPDATE/DELETE (Own Only)
-- Existing policies likely cover this, but ensuring safely:
CREATE POLICY "Users can insert own templates" 
ON "public"."workout_templates" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" 
ON "public"."workout_templates" FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" 
ON "public"."workout_templates" FOR DELETE 
USING (auth.uid() = user_id);
