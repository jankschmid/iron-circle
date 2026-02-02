-- Migration: Seed Cardio/Stretch Exercises and Add Type Column

-- 0. Create Table if not exists (MUST BE FIRST)
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    muscle TEXT,
    equipment TEXT,
    instructions TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    type TEXT DEFAULT 'Strength',
    default_duration INTEGER
);

-- 1. Add 'type' column to exercises if it doesn't exist (assuming it might not if table already existed)
-- Using a safe DO block to check column existence
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'type') THEN
        ALTER TABLE exercises ADD COLUMN type TEXT DEFAULT 'Strength';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'default_duration') THEN
        ALTER TABLE exercises ADD COLUMN default_duration INTEGER; -- Duration in seconds
    END IF;
END $$;

-- 2. Seed Data
-- We will use ON CONFLICT DO UPDATE so you can run this safely multiple times.
INSERT INTO exercises (name, type, muscle, default_duration)
VALUES
    ('Treadmill (Running)', 'Cardio', 'Legs', 1200),
    ('Treadmill (Incline Walk)', 'Cardio', 'Glutes', 900),
    ('Stationary Bike', 'Cardio', 'Legs', 1800),
    ('Rowing Machine', 'Cardio', 'Back', 1200),
    ('Elliptical', 'Cardio', 'Legs', 1200),
    ('Stair Climber', 'Cardio', 'Glutes', 600),
    ('Air Bike (Assault Bike)', 'Cardio', 'Full Body', 600),
    ('SkiErg', 'Cardio', 'Lats', 600),
    ('Spin Bike', 'Cardio', 'Legs', 2700),
    ('Recumbent Bike', 'Cardio', 'Legs', 1800),
    ('Jump Rope', 'Cardio', 'Calves', 300),
    ('Burpees', 'Cardio', 'Full Body', NULL),
    ('Jumping Jacks', 'Cardio', 'Full Body', 60),
    ('Mountain Climbers', 'Cardio', 'Core', 60),
    ('High Knees', 'Cardio', 'Legs', 45),
    ('Box Jumps', 'Cardio', 'Legs', NULL),
    ('Battle Ropes', 'Cardio', 'Shoulders', 30),
    
    ('Arm Circles', 'Stretch', 'Shoulders', 30),
    ('Leg Swings', 'Stretch', 'Legs', NULL),
    ('Torso Rotations', 'Stretch', 'Core', NULL),
    ('Walking Lunges', 'Stretch', 'Legs', NULL),
    ('Inchworm', 'Stretch', 'Core', NULL),
    ('World''s Greatest Stretch', 'Stretch', 'Full Body', NULL),
    ('Knee Hugs', 'Stretch', 'Legs', NULL),
    ('Cat-Cow', 'Stretch', 'Back', NULL),
    ('Hamstring Stretch (Standing)', 'Stretch', 'Hamstrings', 45),
    ('Quad Stretch (Standing)', 'Stretch', 'Legs', 45),
    ('Calf Stretch (Wall)', 'Stretch', 'Calves', 45),
    ('Butterfly Stretch', 'Stretch', 'Legs', 60),
    ('Pigeon Pose', 'Stretch', 'Glutes', 60),
    ('Child''s Pose', 'Stretch', 'Back', 60),
    ('Cobra Stretch', 'Stretch', 'Abs', 30),
    ('Triceps Stretch (Overhead)', 'Stretch', 'Arms', 30),
    ('Chest Opener (Doorframe)', 'Stretch', 'Chest', 45),
    ('Hip Flexor Lunge (Kneeling)', 'Stretch', 'Legs', 45),
    ('Seated Forward Fold', 'Stretch', 'Back', 60),
    ('Figure 4 Stretch (Lying)', 'Stretch', 'Glutes', 60),
    ('Neck Tilt', 'Stretch', 'Neck', 30),
    
    ('Wall Slides', 'Stretch', 'Shoulders', NULL),
    ('Thoracic Rotation', 'Stretch', 'Back', NULL),
    ('Deep Squat Hold', 'Stretch', 'Legs', 30)
ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type, default_duration = EXCLUDED.default_duration;

-- 3. Ensure constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exercises_name_key') THEN
        ALTER TABLE exercises ADD CONSTRAINT exercises_name_key UNIQUE (name);
    END IF;
END $$;
