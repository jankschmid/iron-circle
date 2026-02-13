-- RUN THIS IN SUPABASE SQL EDITOR
-- This adds the "flags" column to track auto-translations

ALTER TABLE app_translations 
ADD COLUMN IF NOT EXISTS flags JSONB DEFAULT '{}'::jsonb;
