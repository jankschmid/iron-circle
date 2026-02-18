-- Fix bad durations in 'workouts' (Cap at 4 hours if > 12 hours)
UPDATE workouts
SET 
  end_time = start_time + interval '4 hours',
  duration = 14400 -- 4 * 3600
WHERE 
  duration > 43200 -- 12 hours
  OR (end_time IS NOT NULL AND extract(epoch from (end_time - start_time)) > 43200);

-- Fix bad durations in 'workout_sessions' (Tracker)
UPDATE workout_sessions
SET 
  end_time = start_time + interval '4 hours',
  duration = 14400,
  status = 'timeout'
WHERE 
  status = 'active' 
  AND start_time < (now() - interval '12 hours');

-- Fix ALREADY CLOSED sessions with bad duration
UPDATE workout_sessions
SET 
  end_time = start_time + interval '4 hours',
  duration = 14400
WHERE 
  duration > 43200 -- 12 hours
  OR (end_time IS NOT NULL AND extract(epoch from (end_time - start_time)) > 43200);
