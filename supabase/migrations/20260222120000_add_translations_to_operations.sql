-- Add translations JSONB column to operations_templates
ALTER TABLE operations_templates
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
