-- Add category column to app_translations
ALTER TABLE app_translations 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Uncategorized';

-- Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_app_translations_category ON app_translations(category);
