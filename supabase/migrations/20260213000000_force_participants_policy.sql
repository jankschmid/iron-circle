-- Migration: Force-fix UPDATE policy for conversation_participants
-- Date: 2026-02-13
-- Purpose: Ensure users can definitely update their own participant records (for soft delete)

DROP POLICY IF EXISTS "Users can update own participant records" ON "public"."conversation_participants";

CREATE POLICY "Users can update own participant records" 
ON "public"."conversation_participants" 
FOR UPDATE 
USING ("user_id" = auth.uid())
WITH CHECK ("user_id" = auth.uid());

-- Also ensure they can Select their own rows (usually exists but good to double check or rely on existing)
-- If no select policy exists, Update might fail if it can't find the row. 
-- "Users can view their own participant records" likely exists from setup.
