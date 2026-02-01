-- Gym TV Settings (Configuration for the screen)
CREATE TABLE IF NOT EXISTS gym_tv_settings (
    gym_id UUID PRIMARY KEY REFERENCES gyms(id) ON DELETE CASCADE,
    enabled_features TEXT[] DEFAULT ARRAY['live', 'leaderboard', 'news', 'events'], -- What selected views to cycle through
    loop_duration_sec INTEGER DEFAULT 20, -- Default duration per view
    theme TEXT DEFAULT 'neon', -- 'neon', 'dark', 'light'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gym News / Announcements
CREATE TABLE IF NOT EXISTS gym_news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gym Events
CREATE TABLE IF NOT EXISTS gym_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gym Challenges
CREATE TABLE IF NOT EXISTS gym_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    goal_type TEXT, -- 'volume', 'time', 'visits'
    target_value INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies

-- TV Settings: Public Read (Monitor needs it), Admin Write
ALTER TABLE gym_tv_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_tv_settings' AND policyname = 'Public read tv settings'
    ) THEN
        CREATE POLICY "Public read tv settings" ON gym_tv_settings FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_tv_settings' AND policyname = 'Gym Admins can manage settings'
    ) THEN
        CREATE POLICY "Gym Admins can manage settings" ON gym_tv_settings FOR ALL USING (
            EXISTS (SELECT 1 FROM gyms WHERE gyms.id = gym_tv_settings.gym_id AND gyms.created_by = auth.uid())
        );
    END IF;
END $$;

-- News: Public Read, Admin Write
ALTER TABLE gym_news ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_news' AND policyname = 'Public read news'
    ) THEN
        CREATE POLICY "Public read news" ON gym_news FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_news' AND policyname = 'Gym Admins can manage news'
    ) THEN
        CREATE POLICY "Gym Admins can manage news" ON gym_news FOR ALL USING (
            EXISTS (SELECT 1 FROM gyms WHERE gyms.id = gym_news.gym_id AND gyms.created_by = auth.uid())
        );
    END IF;
END $$;

-- Events: Public Read, Admin Write
ALTER TABLE gym_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_events' AND policyname = 'Public read events'
    ) THEN
        CREATE POLICY "Public read events" ON gym_events FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_events' AND policyname = 'Gym Admins can manage events'
    ) THEN
        CREATE POLICY "Gym Admins can manage events" ON gym_events FOR ALL USING (
            EXISTS (SELECT 1 FROM gyms WHERE gyms.id = gym_events.gym_id AND gyms.created_by = auth.uid())
        );
    END IF;
END $$;

-- Challenges: Public Read, Admin Write
ALTER TABLE gym_challenges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_challenges' AND policyname = 'Public read challenges'
    ) THEN
        CREATE POLICY "Public read challenges" ON gym_challenges FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_challenges' AND policyname = 'Gym Admins can manage challenges'
    ) THEN
        CREATE POLICY "Gym Admins can manage challenges" ON gym_challenges FOR ALL USING (
            EXISTS (SELECT 1 FROM gyms WHERE gyms.id = gym_challenges.gym_id AND gyms.created_by = auth.uid())
        );
    END IF;
END $$;
