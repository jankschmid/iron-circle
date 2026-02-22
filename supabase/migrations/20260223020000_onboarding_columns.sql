-- Onboarding / Setup columns for profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS setup_completed    BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS training_style     TEXT,       -- 'Bodybuilding','Powerlifting','Calisthenics','Crossfit','Endurance','General Fitness'
    ADD COLUMN IF NOT EXISTS rep_range_min      INTEGER     NOT NULL DEFAULT 8,
    ADD COLUMN IF NOT EXISTS rep_range_max      INTEGER     NOT NULL DEFAULT 12;
    -- yearly_workout_goal already added in 20260223010000_streak_system.sql
