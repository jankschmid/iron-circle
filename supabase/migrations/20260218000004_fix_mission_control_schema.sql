-- 1. Create Community Goal Templates (Idempotent)
CREATE TABLE IF NOT EXISTS community_goal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    metric TEXT NOT NULL, 
    target_value BIGINT NOT NULL,
    xp_reward INTEGER NOT NULL,
    focus TEXT[], 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS (Idempotent)
ALTER TABLE community_goal_templates ENABLE ROW LEVEL SECURITY;

-- 3. Policies (Drop & Recreate)
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_goal_templates') THEN
        DROP POLICY IF EXISTS "Public read community templates" ON community_goal_templates;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "Public read community templates" ON community_goal_templates FOR SELECT USING (true);


-- 4. Fix Constraints (Explicit Drop & Add)

-- Community Goal Templates
DO $$ BEGIN
    ALTER TABLE community_goal_templates DROP CONSTRAINT IF EXISTS community_goal_templates_metric_check;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE community_goal_templates ADD CONSTRAINT community_goal_templates_metric_check 
    CHECK (metric IN ('VOLUME', 'WORKOUTS', 'DISTANCE', 'DURATION'));

-- Community Goals
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_goals') THEN
        ALTER TABLE community_goals DROP CONSTRAINT IF EXISTS community_goals_metric_check;
        ALTER TABLE community_goals ADD CONSTRAINT community_goals_metric_check CHECK (metric IN ('VOLUME', 'WORKOUTS', 'DISTANCE', 'DURATION'));
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Operations Templates
DO $$ BEGIN
    ALTER TABLE operations_templates DROP CONSTRAINT IF EXISTS operations_templates_target_metric_check;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE operations_templates ADD CONSTRAINT operations_templates_target_metric_check 
    CHECK (target_metric IN ('volume', 'workouts', 'distance', 'duration'));
