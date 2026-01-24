-- Clean up data for a specific user ID
-- 1. Copy your User ID from Authentication > Users
-- 2. Replace 'YOUR_USER_ID_HERE' below with your actual UUID
-- 3. Run the script

DO $$
DECLARE
    target_user_id uuid := 'YOUR_USER_ID_HERE'; -- <--- PASTE YOUR ID HERE
BEGIN
    if target_user_id = 'YOUR_USER_ID_HERE' then
        raise notice 'Please replace YOUR_USER_ID_HERE with your actual User UUID';
        return;
    end if;

    -- 1. Delete Workout Sessions
    delete from public.workout_sessions where user_id = target_user_id;
    
    -- 2. Leave Memberships
    delete from public.community_members where user_id = target_user_id;
    delete from public.conversation_participants where user_id = target_user_id;
    
    -- 3. Un-save gyms
    delete from public.user_gyms where user_id = target_user_id;

    -- 4. Delete Gyms created by this user
    delete from public.conversations 
    where gym_id in (select id::text from public.gyms where created_by = target_user_id);

    delete from public.communities 
    where gym_id in (select id from public.gyms where created_by = target_user_id);

    delete from public.user_gyms 
    where gym_id in (select id from public.gyms where created_by = target_user_id);

    delete from public.gyms where created_by = target_user_id;

    RAISE NOTICE 'Cleanup complete for user %', target_user_id;
END $$;
