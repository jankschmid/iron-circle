-- Ensure all missing live database columns are present for the operations dashboard

ALTER TABLE operations_templates 
ADD COLUMN IF NOT EXISTS focus text[] DEFAULT NULL;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS goal TEXT;

-- Seed Focus Tags if missing
UPDATE operations_templates SET focus = '{Hypertrophy, Strength}' WHERE title = 'Volume Eater' AND focus IS NULL;
UPDATE operations_templates SET focus = '{Hypertrophy, Strength}' WHERE title = 'Heavy Hitter' AND focus IS NULL;
UPDATE operations_templates SET focus = '{Endurance, Weight Loss}' WHERE title = 'Cardio Scout' AND focus IS NULL;
UPDATE operations_templates SET focus = '{Hypertrophy, Strength, Endurance, Weight Loss}' WHERE title = 'Morning Drill' AND focus IS NULL;
UPDATE operations_templates SET focus = '{Hypertrophy, Strength, Endurance, Weight Loss}' WHERE title = 'Just Show Up' AND focus IS NULL;
UPDATE operations_templates SET focus = '{Hypertrophy, Strength, Endurance, Weight Loss}' WHERE title = 'Iron Consistency' AND focus IS NULL;
UPDATE operations_templates SET focus = '{Endurance, Weight Loss}' WHERE title = 'Marathon Man' AND focus IS NULL;
UPDATE operations_templates SET focus = '{Hypertrophy, Strength}' WHERE title = 'Century Club' AND focus IS NULL;
