-- Migration: Add UPDATE policy for conversation_participants
-- Date: 2026-02-05
-- Purpose: Allow users to update their own conversation_participants records (for soft delete)

CREATE POLICY "Users can update own participant records" 
ON "public"."conversation_participants" 
FOR UPDATE 
USING ("user_id" = auth.uid())
WITH CHECK ("user_id" = auth.uid());
