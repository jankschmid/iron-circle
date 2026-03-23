-- Add equipment_type and default_increment to exercises table

ALTER TABLE exercises
ADD COLUMN equipment_type TEXT DEFAULT 'barbell',
ADD COLUMN default_increment NUMERIC DEFAULT 2.5;

-- Update existing exercises with some logical defaults based on name or category (optional, but good for UX)
-- If not specified, they fall back to 'barbell' and 2.5.

-- Examples of updating based on name mappings could go here if we wanted to seed data,
-- but for now we'll just add the columns. 

-- You may want to add a check constraint if we have specific types
ALTER TABLE exercises
ADD CONSTRAINT chk_equipment_type CHECK (equipment_type IN ('cable', 'machine', 'barbell', 'dumbbell', 'bodyweight', 'other'));
