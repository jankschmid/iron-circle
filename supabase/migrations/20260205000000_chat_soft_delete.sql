-- Migration: Chat Soft Delete
-- Date: 2026-02-05

ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for performance on filtering
CREATE INDEX IF NOT EXISTS idx_conversation_participants_deleted_at ON conversation_participants(deleted_at);
