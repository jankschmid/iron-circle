-- Enable RLS on exercises table
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Allow public read access (authenticated and anonymous)
CREATE POLICY "Public Read Exercises" ON exercises
    FOR SELECT
    USING (true);
