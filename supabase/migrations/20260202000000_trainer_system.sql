-- Migration: Trainer System & Roles
-- 1. Ensure 'role' column exists in community_members (or create gym_roles if preferred)
-- We will use a dedicated gym_members structure if not robust enough, but likely we can use community_members?
-- Actually, the user requested 'trainer_relationships', so let's build that properly independent of communities.

-- 1. Trainer Roles & Relationships
CREATE TABLE IF NOT EXISTS trainer_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'archived', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Allow one active relationship per trainer-client pair
    UNIQUE(trainer_id, client_id)
);

-- RLS for trainer_relationships
ALTER TABLE trainer_relationships ENABLE ROW LEVEL SECURITY;

-- Trainers can view their clients
CREATE POLICY "Trainers can view their clients" ON trainer_relationships
    FOR SELECT USING (auth.uid() = trainer_id);

-- Clients can view their trainers
CREATE POLICY "Clients can view their trainers" ON trainer_relationships
    FOR SELECT USING (auth.uid() = client_id);

-- Trainers can insert (invite)
CREATE POLICY "Trainers can invite clients" ON trainer_relationships
    FOR INSERT WITH CHECK (auth.uid() = trainer_id);

-- Clients can update status (accept)
CREATE POLICY "Clients can accept invites" ON trainer_relationships
    FOR UPDATE USING (auth.uid() = client_id);
    
-- Trainers can update status (archive)
CREATE POLICY "Trainers can manage status" ON trainer_relationships
    FOR UPDATE USING (auth.uid() = trainer_id);


-- 2. Plan Assignments (Trainer assigning text/plan to client)
CREATE TABLE IF NOT EXISTS plan_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES auth.users(id),
    client_id UUID NOT NULL REFERENCES auth.users(id),
    plan_id UUID REFERENCES workout_plans(id), -- If assigning a full plan
    
    -- Settings for Algorithm Oversight
    settings JSONB DEFAULT '{"allow_smart_suggestions": true, "is_strict": false}',
    
    notes TEXT,
    
    active_from TIMESTAMPTZ DEFAULT NOW(),
    active_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE plan_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View assignments" ON plan_assignments
    FOR SELECT USING (auth.uid() = trainer_id OR auth.uid() = client_id);

CREATE POLICY "Manage assignments" ON plan_assignments
    FOR ALL USING (auth.uid() = trainer_id);


-- 3. Gym Roles (if needed for RBAC middleware)
-- We'll assume existing gyms table or user_gyms can handle 'role' column addition?
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_gyms' AND column_name = 'role') THEN
        ALTER TABLE user_gyms ADD COLUMN role TEXT DEFAULT 'member'; -- 'owner', 'trainer', 'member'
    END IF;
END $$;
