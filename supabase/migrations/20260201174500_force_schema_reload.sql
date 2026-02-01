-- Attempt to touch the column to verify existence and force schema update
COMMENT ON COLUMN workouts.plan_id IS 'Link to workout plan';

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
