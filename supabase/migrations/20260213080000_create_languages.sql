-- Create app_languages table for dynamic language management
-- Date: 2026-02-13

CREATE TABLE IF NOT EXISTS app_languages (
  code TEXT PRIMARY KEY, -- 'en', 'de', 'es'
  label TEXT NOT NULL,   -- 'English', 'Deutsch'
  flag TEXT,             -- Emoji flag or url
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE app_languages ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active languages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_languages' AND policyname = 'Public read access'
    ) THEN
        CREATE POLICY "Public read access" ON app_languages FOR SELECT USING (true);
    END IF;
END $$;

-- Policy: Only Admins can insert/update/delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_languages' AND policyname = 'Admins can manage languages'
    ) THEN
        CREATE POLICY "Admins can manage languages" ON app_languages
        FOR ALL
        USING (
          auth.uid() IN (
            SELECT id FROM profiles WHERE is_super_admin = true
          )
        );
    END IF;
END $$;

-- Seed initial data
INSERT INTO app_languages (code, label, flag) VALUES
('en', 'English', '🇬🇧'),
('de', 'Deutsch', '🇩🇪'),
('es', 'Español', '🇪🇸'),
('fr', 'Français', '🇫🇷'),
('it', 'Italiano', '🇮🇹'),
('pt', 'Português', '🇵🇹'),
('ru', 'Русский', '🇷🇺'),
('ja', '日本語', '🇯🇵'),
('ko', '한국어', '🇰🇷'),
('zh', '中文', '🇨🇳')
ON CONFLICT (code) DO NOTHING;
