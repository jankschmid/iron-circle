
-- Check Columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Check Triggers
SELECT event_object_table as table_name, trigger_name, action_statement, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- Check if there's a specific function overriding it
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%profiles%';
