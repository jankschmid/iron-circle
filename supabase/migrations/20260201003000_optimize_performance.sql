-- Optimizing Performance for Gym TV and Polling

-- 1. Workout Sessions (Heavy polling for 'active' sessions)
-- Used by: get_live_gym_activity, Gym Monitor
CREATE INDEX IF NOT EXISTS idx_workout_sessions_gym_poll 
ON public.workout_sessions(gym_id, start_time, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_status 
ON public.workout_sessions(user_id, status);

-- 2. Friendships (Feed fetching)
CREATE INDEX IF NOT EXISTS idx_friendships_user_status 
ON public.friendships(user_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_friend_status 
ON public.friendships(friend_id, status);

-- 3. Gym TV Settings & Content
CREATE INDEX IF NOT EXISTS idx_gym_tv_settings_gym 
ON public.gym_tv_settings(gym_id);

CREATE INDEX IF NOT EXISTS idx_gym_news_gym_active 
ON public.gym_news(gym_id, is_active);

CREATE INDEX IF NOT EXISTS idx_gym_events_gym_date 
ON public.gym_events(gym_id, event_date);
