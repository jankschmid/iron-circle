-- IRONCIRCLE SECURITY FIX REVISION (2024-01-30)
-- Re-applies search_path fixes including 'extensions' schema to support PostGIS types.

DO $$
DECLARE
    r RECORD;
    func_names text[] := ARRAY[
        'admin_search_users', 
        'is_participant', 
        'get_gyms_nearby', 
        'cleanup_my_data', 
        'get_gym_coordinates', 
        'get_platform_stats', 
        'cleanup_stale_sessions', 
        'is_chat_member', 
        'delete_workout', 
        'get_live_gym_activity', 
        'get_gym_leaderboard', 
        'update_community_member_count', 
        'auto_accept_bot_friend', 
        'verify_gym_display_key'
    ];
BEGIN
    FOR r IN 
        SELECT oid::regprocedure::text as sig 
        FROM pg_proc 
        WHERE proname = ANY(func_names)
        AND pronamespace = 'public'::regnamespace
    LOOP
        RAISE NOTICE 'Securing function with extensions: %', r.sig;
        EXECUTE 'ALTER FUNCTION ' || r.sig || ' SET search_path = public, extensions';
    END LOOP;
END$$;
