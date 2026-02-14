-- 1. Remove the default value 'Muscle' so new users start with NULL (forcing selection)
ALTER TABLE profiles ALTER COLUMN goal DROP DEFAULT;

-- 2. Reset existing 'Muscle' entries to NULL
-- This ensures the GoalSelectorModal pops up for everyone who hasn't explicitly chosen something else yet.
UPDATE profiles 
SET goal = NULL 
WHERE goal = 'Muscle';
