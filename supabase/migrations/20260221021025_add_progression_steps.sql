-- Add progression_step to exercises table
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS progression_step NUMERIC DEFAULT 1.25;

-- Set large compound exercises to 2.5kg progression step
UPDATE exercises 
SET progression_step = 2.5 
WHERE name ILIKE '%bench press%'
   OR name ILIKE '%squat%'
   OR name ILIKE '%deadlift%'
   OR name ILIKE '%leg press%'
   OR name ILIKE '%barbell row%'
   OR name ILIKE '%pull-up%'
   OR name ILIKE '%pull up%'
   OR name ILIKE '%lat pulldown%'
   OR name ILIKE '%overhead press%'
   OR name ILIKE '%military press%'
   OR muscle IN ('Chest', 'Back', 'Legs', 'Quadriceps', 'Hamstrings', 'Glutes') AND equipment IN ('Barbell', 'Machine');
