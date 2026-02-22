-- Add translations parameter to community_goal_templates
ALTER TABLE community_goal_templates
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
