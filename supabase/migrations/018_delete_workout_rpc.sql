-- RPC to safely delete a workout and its logs
create or replace function delete_workout(target_workout_id uuid)
returns void
language plpgsql
security definer -- Runs with privileges of the function creator (admin) to ensure cleanup
as $$
begin
    -- Check ownership (redundant if RLS exists, but good for safety in security definer)
    if not exists (select 1 from public.workouts where id = target_workout_id and user_id = auth.uid()) then
        raise exception 'Not authorized or workout not found';
    end if;

    -- Delete logs first (orphan cleanup)
    delete from public.workout_logs
    where workout_id = target_workout_id;

    -- Delete workout
    delete from public.workouts
    where id = target_workout_id;
end;
$$;
