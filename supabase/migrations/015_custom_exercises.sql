-- Create Table
CREATE TABLE public.custom_exercises (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    muscle TEXT DEFAULT 'Other',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own custom exercises"
ON public.custom_exercises
FOR ALL
USING (auth.uid() = user_id);

-- Explicitly allow reading (though ALL covers it)
-- CREATE POLICY "Users can read own custom exercises" ...
