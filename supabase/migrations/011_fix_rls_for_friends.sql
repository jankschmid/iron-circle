-- Fix RLS to allow friends to view each other's activity

-- Policy for Workout Sessions
create policy "Friends can view sessions"
on public.workout_sessions for select
using (
  exists (
    select 1 from friendships
    where status = 'accepted'
    and (
      (user_id = auth.uid() and friend_id = workout_sessions.user_id)
      OR
      (friend_id = auth.uid() and user_id = workout_sessions.user_id)
    )
  )
);

-- Policy for Workouts (assuming table exists and has RLS enabled)
-- First enable RLS just in case (is idempotent usually, or safe enough)
alter table public.workouts enable row level security;

create policy "Friends can view workouts"
on public.workouts for select
using (
  exists (
    select 1 from friendships
    where status = 'accepted'
    and (
      (user_id = auth.uid() and friend_id = workouts.user_id)
      OR
      (friend_id = auth.uid() and user_id = workouts.user_id)
    )
  )
);
