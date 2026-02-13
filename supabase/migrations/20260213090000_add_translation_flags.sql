-- Add flags column to app_translations to track metadata (e.g. auto-translated status)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'app_translations'
        AND column_name = 'flags'
    ) THEN
        ALTER TABLE app_translations ADD COLUMN flags JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
