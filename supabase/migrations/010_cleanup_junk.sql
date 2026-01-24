-- Function to clean up all data created by the user
-- Run this in Supabase SQL Editor:
-- SELECT cleanup_my_data();

create or replace function cleanup_my_data()
returns void
language plpgsql
security definer
as $$
declare
    curr_user_id uuid;
begin
    curr_user_id := auth.uid();
    
    -- 1. Delete My Workout Sessions
    delete from public.workout_sessions where user_id = curr_user_id;
    
    -- 2. Leave all Communities
    delete from public.community_members where user_id = curr_user_id;

    -- 3. Leave all Conversations
    delete from public.conversation_participants where user_id = curr_user_id;
    
    -- 4. Un-save all gyms (remove from my list)
    delete from public.user_gyms where user_id = curr_user_id;

    -- 5. Delete Gyms created by ME (and everything linked to them)
    -- This handles the "Junk" created during testing
    
    -- 5a. Delete Conversations linked to my created gyms
    delete from public.conversations 
    where gym_id in (select id::text from public.gyms where created_by = curr_user_id);

    -- 5b. Delete Communities linked to my created gyms
    delete from public.communities 
    where gym_id in (select id from public.gyms where created_by = curr_user_id);

    -- 5c. Delete user_gym links for OTHERS who might have joined my junk gyms
    delete from public.user_gyms 
    where gym_id in (select id from public.gyms where created_by = curr_user_id);

    -- 5d. Finally Delete the Gyms themselves
    delete from public.gyms where created_by = curr_user_id;
    
end;
$$;
