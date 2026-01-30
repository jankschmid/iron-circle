-- IRONCIRCLE SECURITY FIX (2024-01-30)
-- Fixes "Function Search Path Mutable" warnings by explicitly setting search_path to public.

-- List of functions to fix:
-- admin_search_users, is_participant, get_gyms_nearby, cleanup_my_data, 
-- get_gym_coordinates, get_platform_stats, cleanup_stale_sessions, 
-- is_chat_member, delete_workout, get_live_gym_activity, 
-- get_gym_leaderboard, update_community_member_count, auto_accept_bot_friend

-- 1. Fix Search Path for Security Definitive Functions (Dynamic Loop)
-- This avoids "function does not exist" errors due to signature mismatches
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
        AND pronamespace = 'public'::regnamespace -- Only fix public functions
    LOOP
        RAISE NOTICE 'Securing function: %', r.sig;
        EXECUTE 'ALTER FUNCTION ' || r.sig || ' SET search_path = public, extensions';
    END LOOP;
END$$;

-- 2. Harden Notifications RLS (Prevent Spam)
-- Current policy "System can insert notifications" allows ANYONE to insert.
-- We restrict INSERT to:
-- 1. Users inserting for themselves? (Maybe not needed)
-- 2. Service Role (Bypasses RLS anyway)
-- 3. Super Admins
-- 4. Or if it's really needed for users to trigger notifications for OTHERS (e.g. friend request), they should use an RPC.
-- For now, let's keep it but at least ensure they can only insert if they are authenticated.
-- Note: 'true' usually implies valid simply by existing.
-- Better policy: "Users can insert notifications for THEMSELVES or via RPC"
-- This is complex to change blindly. I'll stick to search_path fixes for now unless requested.
