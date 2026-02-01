-- Workout Plans Table
CREATE TABLE workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan Days (Linking Plans to Templates)
CREATE TABLE workout_plan_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
    day_order INT NOT NULL, -- 1-based index (Day 1, Day 2...)
    label TEXT, -- e.g., "Push Day", "Legs + Abs"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plan_days ENABLE ROW LEVEL SECURITY;

-- Plans Policies
CREATE POLICY "Users can view their own plans"
ON workout_plans FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own plans"
ON workout_plans FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
ON workout_plans FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
ON workout_plans FOR DELETE
USING (auth.uid() = user_id);

-- Plan Days Policies (Cascading access based on plan ownership technically, but explicit is safer)
CREATE POLICY "Users can view days of their plans"
ON workout_plan_days FOR SELECT
USING (EXISTS (
    SELECT 1 FROM workout_plans 
    WHERE workout_plans.id = workout_plan_days.plan_id 
    AND workout_plans.user_id = auth.uid()
));

CREATE POLICY "Users can insert days into their plans"
ON workout_plan_days FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM workout_plans 
    WHERE workout_plans.id = workout_plan_days.plan_id 
    AND workout_plans.user_id = auth.uid()
));

CREATE POLICY "Users can update days of their plans"
ON workout_plan_days FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM workout_plans 
    WHERE workout_plans.id = workout_plan_days.plan_id 
    AND workout_plans.user_id = auth.uid()
));

CREATE POLICY "Users can delete days from their plans"
ON workout_plan_days FOR DELETE
USING (EXISTS (
    SELECT 1 FROM workout_plans 
    WHERE workout_plans.id = workout_plan_days.plan_id 
    AND workout_plans.user_id = auth.uid()
));
