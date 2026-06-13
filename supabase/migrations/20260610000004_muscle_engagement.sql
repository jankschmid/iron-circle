ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS muscle_engagement JSONB DEFAULT '{}'::jsonb;

ALTER TABLE custom_exercises 
ADD COLUMN IF NOT EXISTS muscle_engagement JSONB DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
