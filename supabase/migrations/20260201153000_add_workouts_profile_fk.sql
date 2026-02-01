-- Add explicit foreign key from workouts.user_id to profiles.id
-- This allows PostgREST to detect the relationship for joins like profile:user_id(...)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_workouts_profiles'
    ) THEN
        ALTER TABLE workouts 
        ADD CONSTRAINT fk_workouts_profiles 
        FOREIGN KEY (user_id) 
        REFERENCES profiles(id);
    END IF;
END $$;
