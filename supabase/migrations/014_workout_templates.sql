-- Create Table
CREATE TABLE public.workout_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    exercises JSONB NOT NULL DEFAULT '[]', -- Array of { id, targetSets, targetReps }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates"
ON public.workout_templates
FOR ALL
USING (auth.uid() = user_id);

-- Migration Entry (optional tracking)
COMMENT ON TABLE public.workout_templates IS 'User customized workout templates';
