


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."admin_search_users"("search_term" "text") RETURNS TABLE("id" "uuid", "email" "text", "name" "text", "handle" "text", "avatar_url" "text", "is_super_admin" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        'hidden@email.com'::text as email, -- Placeholder as we can't easily join auth.users securely here without complications
        p.name,
        p.handle,
        p.avatar_url,
        p.is_super_admin
    FROM profiles p
    WHERE 
        p.name ILIKE '%' || search_term || '%' 
        OR p.handle ILIKE '%' || search_term || '%'
    LIMIT 20;
END;
$$;


ALTER FUNCTION "public"."admin_search_users"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_accept_bot_friend"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  if new.friend_id = '00000000-0000-0000-0000-000000000001' then
    new.status := 'accepted';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."auto_accept_bot_friend"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_gym_member"("p_gym_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_gyms 
    WHERE gym_id = p_gym_id 
    AND user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."check_is_gym_member"("p_gym_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_my_data"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
    -- 1. Delete My Workout Sessions
    delete from public.workout_sessions where user_id = auth.uid();
    
    -- 2. Leave all Communities
    delete from public.community_members where user_id = auth.uid();

    -- 3. Leave all Conversations
    delete from public.conversation_participants where user_id = auth.uid();
    
    -- 4. Un-save all gyms
    delete from public.user_gyms where user_id = auth.uid();

    -- 5. Delete Gyms created by ME
    delete from public.conversations 
    where gym_id in (select id::text from public.gyms where created_by = auth.uid());

    delete from public.communities 
    where gym_id in (select id from public.gyms where created_by = auth.uid());

    delete from public.user_gyms 
    where gym_id in (select id from public.gyms where created_by = auth.uid());

    delete from public.gyms where created_by = auth.uid();
end;
$$;


ALTER FUNCTION "public"."cleanup_my_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_stale_sessions"("timeout_minutes" integer DEFAULT 240) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    affected_rows INT;
    timeout_interval INTERVAL;
BEGIN
    timeout_interval := (timeout_minutes || ' minutes')::INTERVAL;

    WITH updated AS (
        UPDATE public.workout_sessions
        SET 
            status = 'timeout',
            end_time = (start_time + timeout_interval),
            duration = (EXTRACT(EPOCH FROM timeout_interval)::INT),
            auto_closed = true
        WHERE 
            status = 'active' 
            AND start_time < (NOW() - timeout_interval)
        RETURNING id
    )
    SELECT COUNT(*) INTO affected_rows FROM updated;

    RETURN affected_rows;
END;
$$;


ALTER FUNCTION "public"."cleanup_stale_sessions"("timeout_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_own_user"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from auth.users (Cascades to profiles usually, but we doing manual cleanup too just in case)
  -- Note: We must ensure we only delete the calling user.
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;


ALTER FUNCTION "public"."delete_own_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_workout"("target_workout_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
    -- Check ID exists and belongs to user
    if not exists (select 1 from public.workouts where id = target_workout_id and user_id = auth.uid()) then
        raise exception 'Not authorized or workout not found';
    end if;

    -- Delete logs first
    delete from public.workout_logs where workout_id = target_workout_id;

    -- Delete workout
    delete from public.workouts where id = target_workout_id;
end;
$$;


ALTER FUNCTION "public"."delete_workout"("target_workout_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."disconnect_gym_monitor"("p_monitor_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_gym_id UUID;
    v_gym_exists BOOLEAN;
BEGIN
    -- Get the gym_id of the monitor to verify ownership
    SELECT gym_id INTO v_gym_id
    FROM public.gym_monitors
    WHERE id = p_monitor_id;

    IF v_gym_id IS NULL THEN
        RAISE EXCEPTION 'Monitor not found or already disconnected.';
    END IF;

    -- Verify user owns the gym associated with this monitor
    SELECT EXISTS (
        SELECT 1 FROM public.gyms 
        WHERE id = v_gym_id 
        AND (created_by = auth.uid() OR auth.jwt() ->> 'is_service_role' = 'true')
    ) INTO v_gym_exists;
    
    IF NOT v_gym_exists THEN
        RAISE EXCEPTION 'Access Denied: You do not own this gym.';
    END IF;

    -- Reset the monitor connection
    UPDATE public.gym_monitors
    SET gym_id = NULL,
        status = 'pending',
        updated_at = NOW()
    WHERE id = p_monitor_id;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."disconnect_gym_monitor"("p_monitor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_gym_member_by_email"("p_gym_id" "uuid", "p_email" "text") RETURNS TABLE("id" "uuid", "name" "text", "handle" "text", "avatar" "text", "member_role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    target_uid UUID;
    caller_role TEXT;
BEGIN
    -- Check permissions: Caller must be owner or admin of the gym
    SELECT role INTO caller_role
    FROM user_gyms
    WHERE user_id = auth.uid() AND gym_id = p_gym_id;

    IF caller_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: You must be an admin or owner to search for staff.';
    END IF;

    -- Lookup User ID from Email (auth.users)
    SELECT u.id INTO target_uid
    FROM auth.users u
    WHERE lower(u.email) = lower(p_email);

    IF target_uid IS NULL THEN
        RETURN; -- No user found
    END IF;

    -- Check if this user is a member of the gym and return profile
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.handle,
        p.avatar, -- assuming avatar column exists in profiles or we select avatar_url
        ug.role AS member_role
    FROM profiles p
    JOIN user_gyms ug ON ug.user_id = p.id
    WHERE p.id = target_uid AND ug.gym_id = p_gym_id;
END;
$$;


ALTER FUNCTION "public"."find_gym_member_by_email"("p_gym_id" "uuid", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_gym_code"("length" integer DEFAULT 8) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_gym_code"("length" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_trainer_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No I, O, 1, 0 to avoid confusion
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN 'TR-' || result;
END;
$$;


ALTER FUNCTION "public"."generate_trainer_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_gym_summaries"() RETURNS TABLE("id" "uuid", "name" "text", "address" "text", "location" "text", "is_verified" boolean, "admin_count" bigint, "member_count" bigint, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT 
        g.id,
        g.name,
        g.address,
        g.location,
        g.is_verified,
        (SELECT COUNT(*) FROM user_gyms ug WHERE ug.gym_id = g.id AND ug.role IN ('admin', 'owner')) as admin_count,
        (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id IN (SELECT id FROM communities WHERE gym_id = g.id)) as member_count,
        g.created_at
    FROM gyms g
    ORDER BY g.created_at DESC;
$$;


ALTER FUNCTION "public"."get_admin_gym_summaries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_gyms_paginated"("p_page_size" integer, "p_page" integer, "p_search" "text" DEFAULT ''::"text") RETURNS TABLE("data" json, "total" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_gyms JSON;
BEGIN
  v_offset := p_page * p_page_size;

  -- 1. Get Total Count (filtering by name or address)
  SELECT COUNT(*) INTO v_total
  FROM gyms
  WHERE 
    p_search IS NULL OR p_search = '' OR
    name ILIKE '%' || p_search || '%' OR
    address ILIKE '%' || p_search || '%';

  -- 2. Get Gyms with Admin Count
  SELECT JSON_AGG(t) INTO v_gyms
  FROM (
    SELECT 
      g.*,
      (SELECT COUNT(*) FROM user_gyms ug WHERE ug.gym_id = g.id AND ug.role IN ('owner', 'admin')) as admin_count
    FROM gyms g
    WHERE 
        p_search IS NULL OR p_search = '' OR
        name ILIKE '%' || p_search || '%' OR
        address ILIKE '%' || p_search || '%'
    ORDER BY g.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset
  ) t;

  -- Return as single JSON object
  RETURN QUERY SELECT v_gyms as data, v_total as total;
END;
$$;


ALTER FUNCTION "public"."get_admin_gyms_paginated"("p_page_size" integer, "p_page" integer, "p_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_gym_coordinates"("gym_ids" "uuid"[]) RETURNS TABLE("id" "uuid", "latitude" double precision, "longitude" double precision)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
    select 
        id,
        st_y(location::geometry) as latitude,
        st_x(location::geometry) as longitude
    from gyms
    where id = any(gym_ids)
    and location is not null;
$$;


ALTER FUNCTION "public"."get_gym_coordinates"("gym_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_display_key" "text") RETURNS TABLE("category" "text", "user_name" "text", "user_avatar" "text", "value" "text", "rank" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM gyms WHERE id = p_gym_id AND display_key = p_display_key) THEN
        RETURN; 
    END IF;

    -- Dummy Implementation (Replace with real stats queries)
    -- 1. Most Visits (Frequency)
    RETURN QUERY
    SELECT 
        'Most Visits' as category,
        p.name as user_name,
        p.avatar_url as user_avatar,
        count(*)::text || ' visits' as value,
        1 as rank
    FROM workout_sessions ws
    JOIN profiles p ON ws.user_id = p.id
    WHERE ws.gym_id = p_gym_id AND ws.start_time > NOW() - INTERVAL '30 days'
    AND (p.privacy_settings->>'gym_monitor_streaming')::boolean IS TRUE
    GROUP BY p.id, p.name, p.avatar_url
    ORDER BY count(*) DESC
    LIMIT 3;

    -- Add more categories (Volume, etc) via UNION ALL
END;
$$;


ALTER FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_display_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_metric" "text" DEFAULT 'xp'::"text", "p_days" integer DEFAULT 30) RETURNS TABLE("user_id" "uuid", "name" "text", "avatar_url" "text", "value" bigint, "rank" bigint, "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF p_metric = 'xp' THEN
        RETURN QUERY
        SELECT 
            p.id as user_id,
            p.name,
            p.avatar_url,
            p.xp as value,
            RANK() OVER (ORDER BY p.xp DESC)::BIGINT as rank,
            ug.role
        FROM profiles p
        JOIN user_gyms ug ON p.id = ug.user_id
        WHERE ug.gym_id = p_gym_id
        ORDER BY value DESC
        LIMIT 20;

    ELSIF p_metric = 'level' THEN
        RETURN QUERY
        SELECT 
            p.id as user_id,
            p.name,
            p.avatar_url,
            p.level::BIGINT as value,
            RANK() OVER (ORDER BY p.level DESC)::BIGINT as rank,
            ug.role
        FROM profiles p
        JOIN user_gyms ug ON p.id = ug.user_id
        WHERE ug.gym_id = p_gym_id
        ORDER BY value DESC
        LIMIT 20;

    ELSIF p_metric = 'volume' THEN
        RETURN QUERY
        SELECT 
            sub.user_id,
            sub.name,
            sub.avatar_url,
            sub.total_volume as value,
            RANK() OVER (ORDER BY sub.total_volume DESC)::BIGINT as rank,
            sub.role
        FROM (
            SELECT 
                p.id as user_id,
                p.name,
                p.avatar_url,
                COALESCE(SUM(w.volume), 0)::BIGINT as total_volume,
                MAX(ug.role) as role -- aggregation hack, role is constant for user+gym
            FROM profiles p
            JOIN user_gyms ug ON p.id = ug.user_id -- Explicit join for role
            JOIN workouts w ON p.id = w.user_id
            WHERE w.gym_id = p_gym_id
              AND ug.gym_id = p_gym_id -- Ensure role comes from THIS gym
              AND w.end_time > (now() - (p_days || ' days')::INTERVAL)
            GROUP BY p.id, p.name, p.avatar_url
        ) sub
        ORDER BY value DESC
        LIMIT 20;
    
    ELSIF p_metric = 'workouts' THEN
         RETURN QUERY
        SELECT 
            sub.user_id,
            sub.name,
            sub.avatar_url,
            sub.count as value,
            RANK() OVER (ORDER BY sub.count DESC)::BIGINT as rank,
            sub.role
        FROM (
            SELECT 
                p.id as user_id,
                p.name,
                p.avatar_url,
                COUNT(w.id)::BIGINT as count,
                MAX(ug.role) as role
            FROM profiles p
            JOIN user_gyms ug ON p.id = ug.user_id
            JOIN workouts w ON p.id = w.user_id
            WHERE w.gym_id = p_gym_id
              AND ug.gym_id = p_gym_id
              AND w.end_time > (now() - (p_days || ' days')::INTERVAL)
            GROUP BY p.id, p.name, p.avatar_url
        ) sub
        ORDER BY value DESC
        LIMIT 20;

    END IF;
END;
$$;


ALTER FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_metric" "text", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_period" "text" DEFAULT 'month'::"text", "p_metric" "text" DEFAULT 'volume'::"text", "p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "value" bigint, "rank" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_start_date TIMESTAMP;
BEGIN
    -- Determine time range
    IF p_period = 'week' THEN
        v_start_date := (now() - interval '7 days');
    ELSIF p_period = 'month' THEN
        v_start_date := (now() - interval '30 days');
    ELSE
        v_start_date := '1970-01-01'::TIMESTAMP;
    END IF;

    RETURN QUERY
    WITH user_stats AS (
        SELECT 
            w.user_id,
            SUM(w.volume) as total_volume,
            COUNT(w.id) as total_visits
        FROM workouts w
        WHERE w.gym_id = p_gym_id
          AND w.end_time >= v_start_date
          AND w.visibility = 'public'
        GROUP BY w.user_id
    )
    SELECT 
        s.user_id,
        p.username,
        p.avatar_url,
        CASE 
            WHEN p_metric = 'volume' THEN s.total_volume
            ELSE s.total_visits
        END as value,
        RANK() OVER (ORDER BY (CASE WHEN p_metric = 'volume' THEN s.total_volume ELSE s.total_visits END) DESC) as rank
    FROM user_stats s
    JOIN profiles p ON s.user_id = p.id
    ORDER BY rank ASC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_period" "text", "p_metric" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_gyms_nearby"("lat" double precision, "lng" double precision, "radius_meters" double precision) RETURNS TABLE("id" "uuid", "name" "text", "dist_meters" double precision)
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
    select 
        id, 
        name, 
        st_distance(location, st_point(lng, lat)::geography) as dist_meters
    from 
        public.gyms
    where 
        st_dwithin(location, st_point(lng, lat)::geography, radius_meters)
    order by 
        dist_meters asc;
$$;


ALTER FUNCTION "public"."get_gyms_nearby"("lat" double precision, "lng" double precision, "radius_meters" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_live_gym_activity"("p_gym_id" "uuid", "p_display_key" "text" DEFAULT NULL::"text") RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "current_exercise" "text", "current_set" integer, "started_at" timestamp with time zone, "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_valid_key boolean;
BEGIN
    -- 1. Authentication / Authorization Check
    IF p_display_key IS NOT NULL THEN
        -- Monitor Mode: Verify Key
        SELECT verify_gym_display_key(p_gym_id, p_display_key) INTO v_valid_key;
        IF NOT v_valid_key THEN
            RETURN;
        END IF;
    ELSE
        -- App Mode: Verify User is Authenticated (RLS will handle the rest via queries, but good to check)
        -- Ideally check if user is member of gym, but for public gyms visibility might be open.
        -- We will proceed and let the JOINs determine visibility.
    END IF;

    -- 2. Fetch Data
    RETURN QUERY
    SELECT 
        ws.user_id,
        p.username,
        p.avatar_url,
        ws.current_exercise_name,
        ws.current_set_index,
        ws.start_time AS started_at,
        ug.role AS role
    FROM workout_sessions ws
    JOIN profiles p ON ws.user_id = p.id
    LEFT JOIN user_gyms ug ON ug.user_id = ws.user_id AND ug.gym_id = ws.gym_id
    WHERE 
        ws.gym_id = p_gym_id
        AND ws.status = 'active'
        AND COALESCE((p.privacy_settings->>'gym_monitor_streaming')::boolean, true) = true
        AND ws.start_time > (NOW() - INTERVAL '12 hours'); 
END;
$$;


ALTER FUNCTION "public"."get_live_gym_activity"("p_gym_id" "uuid", "p_display_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_live_gym_activity_v2"("p_gym_id" "uuid") RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "current_exercise" "text", "current_set" integer, "started_at" timestamp with time zone, "role" "text", "is_super_admin" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- This V2 is designed for the APP (Authenticated Users).
    -- It assumes RLS is handled or visibility is open for the circle.
    -- (Previous logic checked p_display_key for TV mode, we separate this concern).

    RETURN QUERY
    SELECT 
        ws.user_id,
        p.username,
        p.avatar_url,
        ws.current_exercise_name,
        ws.current_set_index,
        ws.start_time AS started_at,
        ug.role AS role,
        p.is_super_admin
    FROM workout_sessions ws
    JOIN profiles p ON ws.user_id = p.id
    LEFT JOIN user_gyms ug ON ug.user_id = ws.user_id AND ug.gym_id = ws.gym_id
    WHERE 
        ws.gym_id = p_gym_id
        AND ws.status = 'active'
        AND COALESCE((p.privacy_settings->>'gym_monitor_streaming')::boolean, true) = true
        AND ws.start_time > (NOW() - INTERVAL '12 hours'); 
END;
$$;


ALTER FUNCTION "public"."get_live_gym_activity_v2"("p_gym_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_trainer_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_code TEXT;
    new_code TEXT;
BEGIN
    -- Check existing
    SELECT trainer_code INTO current_code FROM profiles WHERE id = auth.uid();
    
    IF current_code IS NOT NULL THEN
        RETURN current_code;
    END IF;

    -- Generate a unique one
    LOOP
        new_code := generate_trainer_code();
        BEGIN
            UPDATE profiles SET trainer_code = new_code WHERE id = auth.uid();
            RETURN new_code;
        EXCEPTION WHEN unique_violation THEN
            -- Retry loop
        END;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."get_my_trainer_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_platform_stats"() RETURNS TABLE("total_users" bigint, "total_gyms" bigint, "verified_gyms" bigint, "active_workouts_now" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    -- Security check: Allow anyone? Ideally restricted, but for MVP relying on client-side hiding + obscurity. 
    -- Or check auth.uid() against a known list. 
    -- For now: Open, but frontend will guard access.
    
    RETURN QUERY
    SELECT 
        (SELECT count(*) FROM profiles) as total_users,
        (SELECT count(*) FROM gyms) as total_gyms,
        (SELECT count(*) FROM gyms WHERE is_verified = true) as verified_gyms,
        (SELECT count(*) FROM workout_sessions WHERE status = 'active') as active_workouts_now;
END;
$$;


ALTER FUNCTION "public"."get_platform_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invite_client_by_id"("p_client_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    exists_check BOOLEAN;
BEGIN
    -- Check if relationship already exists
    SELECT EXISTS (
        SELECT 1 FROM trainer_relationships 
        WHERE trainer_id = auth.uid() AND client_id = p_client_id
    ) INTO exists_check;

    IF exists_check THEN
        RETURN jsonb_build_object('success', false, 'message', 'Relationship already exists');
    END IF;

    -- Insert Pending
    INSERT INTO trainer_relationships (trainer_id, client_id, status)
    VALUES (auth.uid(), p_client_id, 'pending');

    RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."invite_client_by_id"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_chat_member"("_conversation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  return exists (
    select 1
    from conversation_participants
    where conversation_id = _conversation_id
    and user_id = auth.uid()
  );
end;
$$;


ALTER FUNCTION "public"."is_chat_member"("_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_participant"("_conversation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  return exists (
    select 1 from conversation_participants
    where conversation_id = _conversation_id
    and user_id = auth.uid()
  );
end;
$$;


ALTER FUNCTION "public"."is_participant"("_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_gym_with_code"("p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    invite_record RECORD;
    target_gym_id UUID;
    assigned_role TEXT;
    gym_name TEXT;
    existing_role TEXT;
BEGIN
    -- Trim and verify
    p_code := trim(upper(p_code));

    -- Look up valid invite
    SELECT i.*, g.name as gym_name
    INTO invite_record
    FROM gym_invites i
    JOIN gyms g ON g.id = i.gym_id
    WHERE i.code = p_code;

    -- Checks
    IF invite_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Code');
    END IF;

    IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code Expired');
    END IF;

    -- Set variables
    target_gym_id := invite_record.gym_id;
    assigned_role := invite_record.role;
    gym_name := invite_record.gym_name;

    -- IDEMPOTENCY CHECK (Moved Before Usage Limit)
    -- Check if user already in gym
    SELECT role INTO existing_role
    FROM user_gyms 
    WHERE user_id = auth.uid() AND gym_id = target_gym_id;

    IF existing_role IS NOT NULL THEN
        -- User IS already in gym!
        -- Determine if we need to update anything (e.g. role promotion)
        -- But for idempotency (retrying same code), we generally just return success.
        
        -- Optional: If they are 'member' and code is for 'trainer', upgrade them?
        IF assigned_role = 'trainer' AND existing_role = 'member' THEN
             UPDATE user_gyms SET role = 'trainer' WHERE user_id = auth.uid() AND gym_id = target_gym_id;
             UPDATE community_members SET role = 'trainer' WHERE user_id = auth.uid() AND community_id IN (SELECT id FROM communities WHERE gym_id = target_gym_id);
        END IF;

        -- Return Success immediately WITHOUT checking/incrementing usage
        RETURN jsonb_build_object(
            'success', true, 
            'gym_id', target_gym_id, 
            'role', assigned_role, 
            'gym_name', gym_name,
            'message', 'Already a member'
        );
    END IF;

    -- USAGE LIMIT CHECK (Now after membership check)
    IF invite_record.max_uses IS NOT NULL AND invite_record.used_count >= invite_record.max_uses THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code fully used');
    END IF;

    -- Insert new membership
    INSERT INTO user_gyms (user_id, gym_id, role, label, is_default)
    VALUES (auth.uid(), target_gym_id, assigned_role, gym_name, true);
    
    -- Join community
    INSERT INTO community_members (community_id, user_id, role)
    SELECT id, auth.uid(), assigned_role
    FROM communities WHERE gym_id = target_gym_id;

    -- Increment Usage
    UPDATE gym_invites
    SET used_count = used_count + 1
    WHERE id = invite_record.id;

    RETURN jsonb_build_object(
        'success', true, 
        'gym_id', target_gym_id, 
        'role', assigned_role, 
        'gym_name', gym_name
    );
END;
$$;


ALTER FUNCTION "public"."join_gym_with_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_trainer_with_code"("p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    found_trainer_id UUID;
    trainer_name TEXT;
    existing_status TEXT;
BEGIN
    p_code := trim(upper(p_code));

    -- 1. Find Trainer
    SELECT id, name INTO found_trainer_id, trainer_name
    FROM profiles 
    WHERE trainer_code = p_code;

    IF found_trainer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Code');
    END IF;

    IF found_trainer_id = auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'You cannot be your own trainer');
    END IF;

    -- 2. Check Existing Relationship
    SELECT status INTO existing_status 
    FROM trainer_relationships 
    WHERE trainer_id = found_trainer_id 
    AND client_id = auth.uid();

    IF existing_status IS NOT NULL THEN
         RETURN jsonb_build_object('success', false, 'message', 'Already connected (Status: ' || existing_status || ')');
    END IF;

    -- 3. Create Relationship (ACTIVE immediately, as code implies invite)
    INSERT INTO trainer_relationships (trainer_id, client_id, status)
    VALUES (found_trainer_id, auth.uid(), 'active');

    -- 4. Notification for Trainer
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        found_trainer_id,
        'client_joined',
        'New Client Joined',
        'A new client has joined using your code.',
        jsonb_build_object('client_id', auth.uid())
    );

    RETURN jsonb_build_object('success', true, 'trainer_name', trainer_name);
END;
$$;


ALTER FUNCTION "public"."join_trainer_with_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_gym_monitor"("p_code" "text", "p_gym_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_gym_exists BOOLEAN;
BEGIN
    -- Verify user owns the gym (security)
    SELECT EXISTS (
        SELECT 1 FROM public.gyms 
        WHERE id = p_gym_id 
        AND (created_by = auth.uid() OR auth.jwt() ->> 'is_service_role' = 'true')
    ) INTO v_gym_exists;
    
    IF NOT v_gym_exists THEN
        RAISE EXCEPTION 'Access Denied: You do not own this gym.';
    END IF;

    UPDATE public.gym_monitors
    SET gym_id = p_gym_id,
        status = 'active',
        updated_at = NOW()
    WHERE pairing_code = p_code;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."link_gym_monitor"("p_code" "text", "p_gym_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regenerate_gym_codes"("p_gym_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    caller_role TEXT;
BEGIN
    -- Check permissions (must be admin/owner of THIS gym)
    SELECT role INTO caller_role
    FROM user_gyms
    WHERE user_id = auth.uid() AND gym_id = p_gym_id;

    IF caller_role NOT IN ('admin', 'owner') THEN
         RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Update
    UPDATE gyms
    SET access_code_trainer = 'TR-' || generate_gym_code(6),
        access_code_admin = 'AD-' || generate_gym_code(8)
    WHERE id = p_gym_id;

    RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."regenerate_gym_codes"("p_gym_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_new_monitor_device"("p_code" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.gym_monitors (pairing_code)
    VALUES (p_code)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."register_new_monitor_device"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_gym_handover"("p_gym_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    admin_count INT;
    new_code TEXT;
    caller_is_super BOOLEAN;
BEGIN
    -- 1. Check if caller is Super Admin
    SELECT is_super_admin INTO caller_is_super
    FROM profiles
    WHERE id = auth.uid();

    IF caller_is_super IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized: Only Platform Owners can perform this action.';
    END IF;

    -- 2. Check if admins exist
    SELECT COUNT(*) INTO admin_count
    FROM user_gyms
    WHERE gym_id = p_gym_id AND role IN ('admin', 'owner');

    IF admin_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access Denied: Gym already has an active Admin.');
    END IF;

    -- 3. Generate Code
    new_code := 'HO-' || upper(substr(md5(random()::text), 1, 8)); -- Prefix HO (Handover)

    -- 4. Create Invite (One-Time)
    INSERT INTO gym_invites (gym_id, code, role, max_uses, expires_at, created_by)
    VALUES (p_gym_id, new_code, 'admin', 1, NOW() + interval '24 hours', auth.uid());

    RETURN jsonb_build_object(
        'success', true, 
        'code', new_code,
        'message', 'Handover Code Generated. Share this with the new Gym Admin.'
    );
END;
$$;


ALTER FUNCTION "public"."request_gym_handover"("p_gym_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_profiles_secure"("p_query" "text") RETURNS TABLE("id" "uuid", "username" "text", "name" "text", "avatar_url" "text", "is_client" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    p_query := trim(p_query);
    
    IF length(p_query) < 3 THEN
        RETURN; -- Too short
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.name,
        p.avatar_url,
        EXISTS (
            SELECT 1 FROM trainer_relationships tr 
            WHERE tr.trainer_id = auth.uid() 
            AND tr.client_id = p.id 
            AND tr.status IN ('active', 'pending')
        ) as is_client
    FROM profiles p
    WHERE 
        (p.username ILIKE '%' || p_query || '%' OR p.name ILIKE '%' || p_query || '%')
        AND p.id != auth.uid() -- Don't find self
        -- PRIVACY: Only show 'public' profiles OR profiles that are already connected?
        -- User assumption: "accounts in dem Gym einladen".
        -- Let's stick to Public + Friends? Or generally Searchable?
        -- For now: All profiles are searchable by handle (common social app pattern), 
        -- but we rely on the privacy settings for content visibility.
    LIMIT 10;
END;
$$;


ALTER FUNCTION "public"."search_profiles_secure"("p_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_gym_access_codes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.access_code_trainer IS NULL THEN
        NEW.access_code_trainer := 'TR-' || generate_gym_code(6);
    END IF;
    IF NEW.access_code_admin IS NULL THEN
        NEW.access_code_admin := 'AD-' || generate_gym_code(8);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_gym_access_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_community_member_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.communities
        SET member_count = member_count + 1
        WHERE id = NEW.community_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.communities
        SET member_count = member_count - 1
        WHERE id = OLD.community_id;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_community_member_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_gym_member_role"("p_gym_id" "uuid", "p_user_id" "uuid", "p_new_role" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    caller_role TEXT;
    target_role TEXT;
BEGIN
    -- Permission Check
    SELECT role INTO caller_role
    FROM user_gyms
    WHERE user_id = auth.uid() AND gym_id = p_gym_id;

    IF caller_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Validate new role
    IF p_new_role NOT IN ('member', 'trainer', 'admin') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;

    -- Prevent modifying Owner's role if not Owner? 
    -- (For MVP we trust admins don't degrade owners or we add check)
    -- Simple check: Cannot change role OF an owner unless you are the owner.
    SELECT role INTO target_role
    FROM user_gyms WHERE user_id = p_user_id AND gym_id = p_gym_id;
    
    IF target_role = 'owner' THEN
        RAISE EXCEPTION 'Cannot modify Owner role.';
    END IF;

    -- Update
    UPDATE user_gyms
    SET role = p_new_role
    WHERE user_id = p_user_id AND gym_id = p_gym_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Member not found');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."update_gym_member_role"("p_gym_id" "uuid", "p_user_id" "uuid", "p_new_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_gym_display_key"("p_gym_id" "uuid", "p_key" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gyms 
    WHERE id = p_gym_id 
    AND display_key = p_key
  );
END;
$$;


ALTER FUNCTION "public"."verify_gym_display_key"("p_gym_id" "uuid", "p_key" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_languages" (
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "flag" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."app_languages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "translations" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "flags" "jsonb" DEFAULT '{}'::"jsonb",
    "category" "text" DEFAULT 'Uncategorized'::"text"
);


ALTER TABLE "public"."app_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenge_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "value" numeric NOT NULL,
    "proof_url" "text",
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "challenge_entries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."challenge_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenge_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "progress" numeric DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    CONSTRAINT "challenge_participants_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'dropped'::"text"])))
);


ALTER TABLE "public"."challenge_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_rooms" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text",
    "is_group" boolean DEFAULT false
);


ALTER TABLE "public"."chat_rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "avatar_url" "text",
    "member_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "gym_type" "text" DEFAULT 'community'::"text",
    CONSTRAINT "communities_gym_type_check" CHECK (("gym_type" = ANY (ARRAY['community'::"text", 'verified_partner'::"text"])))
);


ALTER TABLE "public"."communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_members" (
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" DEFAULT 'member'::"text",
    "monitor_consent_at" timestamp with time zone
);


ALTER TABLE "public"."community_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_read_at" timestamp with time zone DEFAULT "now"(),
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "name" "text",
    "gym_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversations_type_check" CHECK (("type" = ANY (ARRAY['private'::"text", 'group'::"text", 'gym'::"text", 'community'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_exercises" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "muscle" "text" DEFAULT 'Other'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'going'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_participants_status_check" CHECK (("status" = ANY (ARRAY['going'::"text", 'maybe'::"text", 'not_going'::"text"])))
);


ALTER TABLE "public"."event_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "muscle" "text",
    "equipment" "text",
    "instructions" "text",
    "video_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'Strength'::"text",
    "default_duration" integer
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "friendships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text"]))),
    CONSTRAINT "not_self" CHECK (("user_id" <> "friend_id"))
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gym_challenges" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "gym_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "goal_type" "text",
    "target_value" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gym_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gym_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "gym_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "event_date" timestamp with time zone NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gym_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gym_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "role" "text" NOT NULL,
    "max_uses" integer,
    "used_count" integer DEFAULT 0,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "gym_invites_role_check" CHECK (("role" = ANY (ARRAY['trainer'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."gym_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gym_monitors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pairing_code" "text" NOT NULL,
    "gym_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "gym_monitors_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text"])))
);


ALTER TABLE "public"."gym_monitors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gym_news" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "gym_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text",
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gym_news" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gym_tv_settings" (
    "gym_id" "uuid" NOT NULL,
    "enabled_features" "text"[] DEFAULT ARRAY['live'::"text", 'leaderboard'::"text", 'news'::"text", 'events'::"text"],
    "loop_duration_sec" integer DEFAULT 20,
    "theme" "text" DEFAULT 'neon'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "feature_durations" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."gym_tv_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gyms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "location" "extensions"."geography"(Point,4326),
    "address" "text",
    "created_by" "uuid",
    "source" "text" DEFAULT 'manual'::"text",
    "display_key" "text" DEFAULT "substr"("md5"(("random"())::"text"), 1, 6),
    "is_verified" boolean DEFAULT false,
    "access_code_trainer" "text",
    "access_code_admin" "text",
    CONSTRAINT "gyms_source_check" CHECK (("source" = ANY (ARRAY['gps'::"text", 'manual'::"text", 'import'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."gyms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'text'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trainer_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "plan_id" "uuid",
    "settings" "jsonb" DEFAULT '{"is_strict": false, "allow_smart_suggestions": true}'::"jsonb",
    "notes" "text",
    "active_from" timestamp with time zone DEFAULT "now"(),
    "active_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."plan_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "name" "text",
    "avatar_url" "text",
    "bio" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "gym_id" "text",
    "home_gym_id" "uuid",
    "auto_tracking_enabled" boolean DEFAULT false,
    "privacy_settings" "jsonb" DEFAULT '{"live_status": true, "profile_visibility": "public", "gym_monitor_streaming": true}'::"jsonb",
    "is_super_admin" boolean DEFAULT false,
    "xp" integer DEFAULT 0,
    "level" integer DEFAULT 1,
    "workout_goal" integer DEFAULT 150,
    "gender" "text",
    "height" numeric,
    "weight" numeric,
    "trainer_code" "text",
    "goal" "text" DEFAULT 'Muscle'::"text",
    CONSTRAINT "username_alphanumeric" CHECK (("username" ~* '^[a-zA-Z0-9]+$'::"text")),
    CONSTRAINT "username_length" CHECK ((("char_length"("username") >= 3) AND ("char_length"("username") <= 15)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."goal" IS 'Main training goal: Muscle, Strength, Endurance, Weight Loss';



CREATE TABLE IF NOT EXISTS "public"."room_members" (
    "room_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."room_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."streaks" (
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0,
    "max_streak" integer DEFAULT 0,
    "last_log_date" timestamp with time zone,
    "freezes_remaining" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trainer_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trainer_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "gym_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "trainer_relationships_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'pending'::"text", 'archived'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."trainer_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_gyms" (
    "user_id" "uuid" NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "label" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "radius" integer DEFAULT 200,
    "role" "text" DEFAULT 'member'::"text"
);


ALTER TABLE "public"."user_gyms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workout_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "exercise_id" "text" NOT NULL,
    "sets" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workout_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_plan_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid",
    "template_id" "uuid",
    "day_order" integer NOT NULL,
    "label" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workout_plan_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'scheduled'::"text"
);


ALTER TABLE "public"."workout_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "gym_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "duration" integer,
    "status" "text" DEFAULT 'active'::"text",
    "type" "text" DEFAULT 'manual'::"text",
    "auto_closed" boolean DEFAULT false,
    "group_id" "uuid" DEFAULT "gen_random_uuid"(),
    "current_exercise_name" "text",
    "current_set_index" integer,
    "is_private" boolean DEFAULT false,
    "plan_day_id" "uuid",
    CONSTRAINT "workout_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'timeout'::"text"]))),
    CONSTRAINT "workout_sessions_type_check" CHECK (("type" = ANY (ARRAY['auto'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."workout_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "exercises" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "visibility" "text" DEFAULT 'public'::"text",
    CONSTRAINT "workout_templates_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'private'::"text", 'friends'::"text"])))
);


ALTER TABLE "public"."workout_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."workout_templates" IS 'User customized workout templates';



CREATE TABLE IF NOT EXISTS "public"."workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "template_id" "text",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "volume" double precision DEFAULT 0,
    "duration" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "visibility" "text" DEFAULT 'public'::"text",
    "gym_id" "uuid",
    "plan_id" "uuid",
    "plan_day_id" "uuid",
    CONSTRAINT "workouts_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'private'::"text", 'friends'::"text"])))
);


ALTER TABLE "public"."workouts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."workouts"."plan_id" IS 'Link to workout plan';



ALTER TABLE ONLY "public"."app_languages"
    ADD CONSTRAINT "app_languages_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."app_translations"
    ADD CONSTRAINT "app_translations_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."app_translations"
    ADD CONSTRAINT "app_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenge_entries"
    ADD CONSTRAINT "challenge_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenge_participants"
    ADD CONSTRAINT "challenge_participants_challenge_id_user_id_key" UNIQUE ("challenge_id", "user_id");



ALTER TABLE ONLY "public"."challenge_participants"
    ADD CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_rooms"
    ADD CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_gym_id_key" UNIQUE ("gym_id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_members"
    ADD CONSTRAINT "community_members_pkey" PRIMARY KEY ("community_id", "user_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_exercises"
    ADD CONSTRAINT "custom_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_event_id_user_id_key" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gym_challenges"
    ADD CONSTRAINT "gym_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gym_events"
    ADD CONSTRAINT "gym_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gym_invites"
    ADD CONSTRAINT "gym_invites_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."gym_invites"
    ADD CONSTRAINT "gym_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gym_monitors"
    ADD CONSTRAINT "gym_monitors_pairing_code_key" UNIQUE ("pairing_code");



ALTER TABLE ONLY "public"."gym_monitors"
    ADD CONSTRAINT "gym_monitors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gym_news"
    ADD CONSTRAINT "gym_news_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gym_tv_settings"
    ADD CONSTRAINT "gym_tv_settings_pkey" PRIMARY KEY ("gym_id");



ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_access_code_admin_key" UNIQUE ("access_code_admin");



ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_access_code_trainer_key" UNIQUE ("access_code_trainer");



ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_assignments"
    ADD CONSTRAINT "plan_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_trainer_code_key" UNIQUE ("trainer_code");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_pkey" PRIMARY KEY ("room_id", "user_id");



ALTER TABLE ONLY "public"."streaks"
    ADD CONSTRAINT "streaks_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."trainer_relationships"
    ADD CONSTRAINT "trainer_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainer_relationships"
    ADD CONSTRAINT "trainer_relationships_trainer_id_client_id_key" UNIQUE ("trainer_id", "client_id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "unique_friendship" UNIQUE ("user_id", "friend_id");



ALTER TABLE ONLY "public"."user_gyms"
    ADD CONSTRAINT "user_gyms_pkey" PRIMARY KEY ("user_id", "gym_id");



ALTER TABLE ONLY "public"."workout_likes"
    ADD CONSTRAINT "workout_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_likes"
    ADD CONSTRAINT "workout_likes_workout_id_user_id_key" UNIQUE ("workout_id", "user_id");



ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_plan_days"
    ADD CONSTRAINT "workout_plan_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_templates"
    ADD CONSTRAINT "workout_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_app_translations_category" ON "public"."app_translations" USING "btree" ("category");



CREATE INDEX "idx_communities_gym_id" ON "public"."communities" USING "btree" ("gym_id");



CREATE INDEX "idx_community_members_community_id" ON "public"."community_members" USING "btree" ("community_id");



CREATE INDEX "idx_community_members_user_id" ON "public"."community_members" USING "btree" ("user_id");



CREATE INDEX "idx_conversation_participants_deleted_at" ON "public"."conversation_participants" USING "btree" ("deleted_at");



CREATE INDEX "idx_friendships_friend_status" ON "public"."friendships" USING "btree" ("friend_id", "status");



CREATE INDEX "idx_friendships_user_status" ON "public"."friendships" USING "btree" ("user_id", "status");



CREATE INDEX "idx_gym_events_gym_date" ON "public"."gym_events" USING "btree" ("gym_id", "event_date");



CREATE INDEX "idx_gym_monitors_pairing_code" ON "public"."gym_monitors" USING "btree" ("pairing_code");



CREATE INDEX "idx_gym_news_gym_active" ON "public"."gym_news" USING "btree" ("gym_id", "is_active");



CREATE INDEX "idx_gym_tv_settings_gym" ON "public"."gym_tv_settings" USING "btree" ("gym_id");



CREATE INDEX "idx_messages_conversation" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_participants_user" ON "public"."conversation_participants" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_level" ON "public"."profiles" USING "btree" ("level" DESC);



CREATE INDEX "idx_profiles_name_search" ON "public"."profiles" USING "btree" ("name" "text_pattern_ops") WHERE ("name" IS NOT NULL);



CREATE INDEX "idx_profiles_trainer_code" ON "public"."profiles" USING "btree" ("trainer_code");



CREATE INDEX "idx_profiles_username_search" ON "public"."profiles" USING "btree" ("username" "text_pattern_ops") WHERE ("username" IS NOT NULL);



CREATE INDEX "idx_profiles_xp" ON "public"."profiles" USING "btree" ("xp" DESC);



CREATE INDEX "idx_user_gyms_user_id" ON "public"."user_gyms" USING "btree" ("user_id");



CREATE INDEX "idx_workout_sessions_group_id" ON "public"."workout_sessions" USING "btree" ("group_id");



CREATE INDEX "idx_workout_sessions_gym_poll" ON "public"."workout_sessions" USING "btree" ("gym_id", "start_time", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_workout_sessions_user_status" ON "public"."workout_sessions" USING "btree" ("user_id", "status");



CREATE INDEX "idx_workouts_gym_id" ON "public"."workouts" USING "btree" ("gym_id");



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "community_member_count_trigger" AFTER INSERT OR DELETE ON "public"."community_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_community_member_count"();



CREATE OR REPLACE TRIGGER "on_friend_bot" BEFORE INSERT ON "public"."friendships" FOR EACH ROW EXECUTE FUNCTION "public"."auto_accept_bot_friend"();



CREATE OR REPLACE TRIGGER "trigger_set_gym_codes" BEFORE INSERT ON "public"."gyms" FOR EACH ROW EXECUTE FUNCTION "public"."set_gym_access_codes"();



ALTER TABLE ONLY "public"."challenge_entries"
    ADD CONSTRAINT "challenge_entries_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."gym_challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_entries"
    ADD CONSTRAINT "challenge_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_participants"
    ADD CONSTRAINT "challenge_participants_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."gym_challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_participants"
    ADD CONSTRAINT "challenge_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_members"
    ADD CONSTRAINT "community_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_members"
    ADD CONSTRAINT "community_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_members"
    ADD CONSTRAINT "community_members_user_id_fkey_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_exercises"
    ADD CONSTRAINT "custom_exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."gym_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "fk_workouts_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."gym_challenges"
    ADD CONSTRAINT "gym_challenges_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gym_events"
    ADD CONSTRAINT "gym_events_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gym_invites"
    ADD CONSTRAINT "gym_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."gym_invites"
    ADD CONSTRAINT "gym_invites_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gym_monitors"
    ADD CONSTRAINT "gym_monitors_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gym_news"
    ADD CONSTRAINT "gym_news_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gym_tv_settings"
    ADD CONSTRAINT "gym_tv_settings_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_assignments"
    ADD CONSTRAINT "plan_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."plan_assignments"
    ADD CONSTRAINT "plan_assignments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."workout_plans"("id");



ALTER TABLE ONLY "public"."plan_assignments"
    ADD CONSTRAINT "plan_assignments_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_home_gym_id_fkey" FOREIGN KEY ("home_gym_id") REFERENCES "public"."gyms"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id");



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."streaks"
    ADD CONSTRAINT "streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainer_relationships"
    ADD CONSTRAINT "trainer_relationships_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainer_relationships"
    ADD CONSTRAINT "trainer_relationships_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trainer_relationships"
    ADD CONSTRAINT "trainer_relationships_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_gyms"
    ADD CONSTRAINT "user_gyms_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id");



ALTER TABLE ONLY "public"."user_gyms"
    ADD CONSTRAINT "user_gyms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workout_likes"
    ADD CONSTRAINT "workout_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_likes"
    ADD CONSTRAINT "workout_likes_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_plan_days"
    ADD CONSTRAINT "workout_plan_days_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."workout_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_plan_days"
    ADD CONSTRAINT "workout_plan_days_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workout_templates"
    ADD CONSTRAINT "workout_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."workout_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Admins Delete Translations" ON "public"."app_translations" FOR DELETE USING ((( SELECT "profiles"."is_super_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = true));



CREATE POLICY "Admins Insert Translations" ON "public"."app_translations" FOR INSERT WITH CHECK ((( SELECT "profiles"."is_super_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = true));



CREATE POLICY "Admins Update Translations" ON "public"."app_translations" FOR UPDATE USING ((( SELECT "profiles"."is_super_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = true));



CREATE POLICY "Admins can create invites for their gym" ON "public"."gym_invites" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_gyms"
  WHERE (("user_gyms"."user_id" = "auth"."uid"()) AND ("user_gyms"."gym_id" = "gym_invites"."gym_id") AND ("user_gyms"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Admins can delete invites for their gym" ON "public"."gym_invites" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_gyms"
  WHERE (("user_gyms"."user_id" = "auth"."uid"()) AND ("user_gyms"."gym_id" = "gym_invites"."gym_id") AND ("user_gyms"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Admins can manage languages" ON "public"."app_languages" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."is_super_admin" = true))));



CREATE POLICY "Admins can update monitors" ON "public"."gym_monitors" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."gyms"
  WHERE (("gyms"."id" = "gym_monitors"."gym_id") AND ("gyms"."created_by" = "auth"."uid"())))));



CREATE POLICY "Admins can view invites for their gym" ON "public"."gym_invites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_gyms"
  WHERE (("user_gyms"."user_id" = "auth"."uid"()) AND ("user_gyms"."gym_id" = "gym_invites"."gym_id") AND ("user_gyms"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Anyone can create monitor" ON "public"."gym_monitors" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read monitor" ON "public"."gym_monitors" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create communities" ON "public"."communities" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Authenticated users can view all user_gyms" ON "public"."user_gyms" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view sessions" ON "public"."workout_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Clients can accept invites" ON "public"."trainer_relationships" FOR UPDATE USING (("auth"."uid"() = "client_id"));



CREATE POLICY "Clients can view their trainers" ON "public"."trainer_relationships" FOR SELECT USING (("auth"."uid"() = "client_id"));



CREATE POLICY "Communities are viewable by everyone" ON "public"."communities" FOR SELECT USING (true);



CREATE POLICY "Community creators can update their communities" ON "public"."communities" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Community members are viewable by everyone" ON "public"."community_members" FOR SELECT USING (true);



CREATE POLICY "Creators can delete own gyms" ON "public"."gyms" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Creators can update own gyms" ON "public"."gyms" FOR UPDATE USING (("auth"."uid"() = "created_by")) WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Friends can view templates" ON "public"."workout_templates" FOR SELECT USING ((("visibility" <> 'private'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."friendships"
  WHERE (("friendships"."status" = 'accepted'::"text") AND ((("friendships"."user_id" = "auth"."uid"()) AND ("friendships"."friend_id" = "workout_templates"."user_id")) OR (("friendships"."friend_id" = "auth"."uid"()) AND ("friendships"."user_id" = "workout_templates"."user_id"))))))));



CREATE POLICY "Friends can view workouts" ON "public"."workouts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."friendships"
  WHERE (("friendships"."status" = 'accepted'::"text") AND ((("friendships"."user_id" = "auth"."uid"()) AND ("friendships"."friend_id" = "workouts"."user_id")) OR (("friendships"."friend_id" = "auth"."uid"()) AND ("friendships"."user_id" = "workouts"."user_id")))))));



CREATE POLICY "Gym Admins can manage challenges" ON "public"."gym_challenges" USING ((EXISTS ( SELECT 1
   FROM "public"."gyms"
  WHERE (("gyms"."id" = "gym_challenges"."gym_id") AND ("gyms"."created_by" = "auth"."uid"())))));



CREATE POLICY "Gym Admins can manage events" ON "public"."gym_events" USING ((EXISTS ( SELECT 1
   FROM "public"."gyms"
  WHERE (("gyms"."id" = "gym_events"."gym_id") AND ("gyms"."created_by" = "auth"."uid"())))));



CREATE POLICY "Gym Admins can manage news" ON "public"."gym_news" USING ((EXISTS ( SELECT 1
   FROM "public"."gyms"
  WHERE (("gyms"."id" = "gym_news"."gym_id") AND ("gyms"."created_by" = "auth"."uid"())))));



CREATE POLICY "Gym Admins can manage settings" ON "public"."gym_tv_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."gyms"
  WHERE (("gyms"."id" = "gym_tv_settings"."gym_id") AND ("gyms"."created_by" = "auth"."uid"())))));



CREATE POLICY "Gyms are viewable by everyone" ON "public"."gyms" FOR SELECT USING (true);



CREATE POLICY "Manage assignments" ON "public"."plan_assignments" USING (("auth"."uid"() = "trainer_id"));



CREATE POLICY "Owners Delete Gyms" ON "public"."gyms" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Owners Update Gyms" ON "public"."gyms" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Public Read Exercises" ON "public"."exercises" FOR SELECT USING (true);



CREATE POLICY "Public Read Gyms" ON "public"."gyms" FOR SELECT USING (true);



CREATE POLICY "Public Read Translations" ON "public"."app_translations" FOR SELECT USING (true);



CREATE POLICY "Public profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."app_languages" FOR SELECT USING (true);



CREATE POLICY "Public read challenges" ON "public"."gym_challenges" FOR SELECT USING (true);



CREATE POLICY "Public read events" ON "public"."gym_events" FOR SELECT USING (true);



CREATE POLICY "Public read news" ON "public"."gym_news" FOR SELECT USING (true);



CREATE POLICY "Public read tv settings" ON "public"."gym_tv_settings" FOR SELECT USING (true);



CREATE POLICY "Super Admin Full Access Gyms" ON "public"."gyms" USING ((( SELECT "profiles"."is_super_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = true));



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Trainers can invite clients" ON "public"."trainer_relationships" FOR INSERT WITH CHECK (("auth"."uid"() = "trainer_id"));



CREATE POLICY "Trainers can manage status" ON "public"."trainer_relationships" FOR UPDATE USING (("auth"."uid"() = "trainer_id"));



CREATE POLICY "Trainers can view their clients" ON "public"."trainer_relationships" FOR SELECT USING (("auth"."uid"() = "trainer_id"));



CREATE POLICY "Users can accept friendship" ON "public"."friendships" FOR UPDATE USING (("auth"."uid"() = "friend_id"));



CREATE POLICY "Users can create gyms" ON "public"."gyms" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create their own plans" ON "public"."workout_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete days from their plans" ON "public"."workout_plan_days" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."workout_plans"
  WHERE (("workout_plans"."id" = "workout_plan_days"."plan_id") AND ("workout_plans"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete logs for own workouts" ON "public"."workout_logs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."workouts"
  WHERE (("workouts"."id" = "workout_logs"."workout_id") AND ("workouts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own sessions" ON "public"."workout_sessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own templates" ON "public"."workout_templates" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own user_gyms" ON "public"."user_gyms" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own workout logs" ON "public"."workout_logs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."workouts"
  WHERE (("workouts"."id" = "workout_logs"."workout_id") AND ("workouts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own workouts" ON "public"."workouts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own plans" ON "public"."workout_plans" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can insert days into their plans" ON "public"."workout_plan_days" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_plans"
  WHERE (("workout_plans"."id" = "workout_plan_days"."plan_id") AND ("workout_plans"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert friendships" ON "public"."friendships" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert logs for own workouts" ON "public"."workout_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts"
  WHERE (("workouts"."id" = "workout_logs"."workout_id") AND ("workouts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert messages" ON "public"."messages" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own sessions" ON "public"."workout_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own templates" ON "public"."workout_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own user_gyms" ON "public"."user_gyms" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own workouts" ON "public"."workouts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert participants" ON "public"."conversation_participants" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can join challenges" ON "public"."challenge_participants" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can join communities" ON "public"."community_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can leave communities" ON "public"."community_members" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can like workouts" ON "public"."workout_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own gyms" ON "public"."user_gyms" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own logs" ON "public"."workout_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts"
  WHERE (("workouts"."id" = "workout_logs"."workout_id") AND ("workouts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage own workouts" ON "public"."workouts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own RSVPs" ON "public"."event_participants" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own custom exercises" ON "public"."custom_exercises" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own templates" ON "public"."workout_templates" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own logs" ON "public"."workout_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workouts"
  WHERE (("workouts"."id" = "workout_logs"."workout_id") AND ("workouts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can read own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own workouts" ON "public"."workouts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can request friendship" ON "public"."friendships" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can see likes" ON "public"."workout_likes" FOR SELECT USING (true);



CREATE POLICY "Users can send messages" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND "public"."is_chat_member"("conversation_id")));



CREATE POLICY "Users can submit entries" ON "public"."challenge_entries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can unlike own" ON "public"."workout_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update days of their plans" ON "public"."workout_plan_days" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workout_plans"
  WHERE (("workout_plans"."id" = "workout_plan_days"."plan_id") AND ("workout_plans"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update friendships" ON "public"."friendships" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "Users can update logs for own workouts" ON "public"."workout_logs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workouts"
  WHERE (("workouts"."id" = "workout_logs"."workout_id") AND ("workouts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own participant records" ON "public"."conversation_participants" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own pending entries" ON "public"."challenge_entries" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own sessions" ON "public"."workout_sessions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own templates" ON "public"."workout_templates" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own user_gyms" ON "public"."user_gyms" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own workouts" ON "public"."workouts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their challenge status" ON "public"."challenge_participants" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own plans" ON "public"."workout_plans" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own streaks" ON "public"."streaks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all custom exercises" ON "public"."custom_exercises" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view all workouts" ON "public"."workouts" FOR SELECT USING (true);



CREATE POLICY "Users can view challenge participants" ON "public"."challenge_participants" FOR SELECT USING (true);



CREATE POLICY "Users can view conversations" ON "public"."conversations" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view days of their plans" ON "public"."workout_plan_days" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workout_plans"
  WHERE (("workout_plans"."id" = "workout_plan_days"."plan_id") AND ("workout_plans"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view entries" ON "public"."challenge_entries" FOR SELECT USING (true);



CREATE POLICY "Users can view event participants" ON "public"."event_participants" FOR SELECT USING (true);



CREATE POLICY "Users can view friendships" ON "public"."friendships" FOR SELECT USING (true);



CREATE POLICY "Users can view logs" ON "public"."workout_logs" FOR SELECT USING (true);



CREATE POLICY "Users can view logs for visible workouts" ON "public"."workout_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workouts"
  WHERE (("workouts"."id" = "workout_logs"."workout_id") AND (("workouts"."user_id" = "auth"."uid"()) OR ("workouts"."visibility" = 'public'::"text"))))));



CREATE POLICY "Users can view messages" ON "public"."messages" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view own gyms" ON "public"."user_gyms" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own sessions" ON "public"."workout_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own templates" ON "public"."workout_templates" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own workouts" ON "public"."workouts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view participants" ON "public"."conversation_participants" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_participant"("conversation_id")));



CREATE POLICY "Users can view public workouts" ON "public"."workouts" FOR SELECT USING (("visibility" = 'public'::"text"));



CREATE POLICY "Users can view their own friendships" ON "public"."friendships" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "Users can view their own plans" ON "public"."workout_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own streaks" ON "public"."streaks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "View assignments" ON "public"."plan_assignments" FOR SELECT USING ((("auth"."uid"() = "trainer_id") OR ("auth"."uid"() = "client_id")));



ALTER TABLE "public"."app_languages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenge_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenge_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gym_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gym_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gym_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gym_monitors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gym_news" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gym_tv_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gyms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trainer_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_gyms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_gyms_policy_v2" ON "public"."user_gyms" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."check_is_gym_member"("gym_id")));



CREATE POLICY "user_gyms_write_policy" ON "public"."user_gyms" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."workout_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_plan_days" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_search_users"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_search_users"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_search_users"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_accept_bot_friend"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_accept_bot_friend"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_accept_bot_friend"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_gym_member"("p_gym_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_gym_member"("p_gym_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_gym_member"("p_gym_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_my_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_my_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_my_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_stale_sessions"("timeout_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_stale_sessions"("timeout_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_stale_sessions"("timeout_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_own_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_own_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_own_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_workout"("target_workout_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_workout"("target_workout_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_workout"("target_workout_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."disconnect_gym_monitor"("p_monitor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."disconnect_gym_monitor"("p_monitor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."disconnect_gym_monitor"("p_monitor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_gym_member_by_email"("p_gym_id" "uuid", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_gym_member_by_email"("p_gym_id" "uuid", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_gym_member_by_email"("p_gym_id" "uuid", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_gym_code"("length" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_gym_code"("length" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_gym_code"("length" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_trainer_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_trainer_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_trainer_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_gym_summaries"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_gym_summaries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_gym_summaries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_gyms_paginated"("p_page_size" integer, "p_page" integer, "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_gyms_paginated"("p_page_size" integer, "p_page" integer, "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_gyms_paginated"("p_page_size" integer, "p_page" integer, "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_gym_coordinates"("gym_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_gym_coordinates"("gym_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_gym_coordinates"("gym_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_display_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_display_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_display_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_metric" "text", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_metric" "text", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_metric" "text", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_period" "text", "p_metric" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_period" "text", "p_metric" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_gym_leaderboard"("p_gym_id" "uuid", "p_period" "text", "p_metric" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_gyms_nearby"("lat" double precision, "lng" double precision, "radius_meters" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."get_gyms_nearby"("lat" double precision, "lng" double precision, "radius_meters" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_gyms_nearby"("lat" double precision, "lng" double precision, "radius_meters" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_live_gym_activity"("p_gym_id" "uuid", "p_display_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_live_gym_activity"("p_gym_id" "uuid", "p_display_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_live_gym_activity"("p_gym_id" "uuid", "p_display_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_live_gym_activity_v2"("p_gym_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_live_gym_activity_v2"("p_gym_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_live_gym_activity_v2"("p_gym_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_trainer_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_trainer_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_trainer_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_platform_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_platform_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_platform_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."invite_client_by_id"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."invite_client_by_id"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_client_by_id"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_chat_member"("_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_chat_member"("_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_chat_member"("_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_participant"("_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_participant"("_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_participant"("_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."join_gym_with_code"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."join_gym_with_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_gym_with_code"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."join_trainer_with_code"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."join_trainer_with_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_trainer_with_code"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_gym_monitor"("p_code" "text", "p_gym_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."link_gym_monitor"("p_code" "text", "p_gym_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_gym_monitor"("p_code" "text", "p_gym_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."regenerate_gym_codes"("p_gym_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."regenerate_gym_codes"("p_gym_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regenerate_gym_codes"("p_gym_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_new_monitor_device"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_new_monitor_device"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_new_monitor_device"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_gym_handover"("p_gym_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."request_gym_handover"("p_gym_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_gym_handover"("p_gym_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_profiles_secure"("p_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_profiles_secure"("p_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_profiles_secure"("p_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_gym_access_codes"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_gym_access_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_gym_access_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_community_member_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_community_member_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_community_member_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_gym_member_role"("p_gym_id" "uuid", "p_user_id" "uuid", "p_new_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_gym_member_role"("p_gym_id" "uuid", "p_user_id" "uuid", "p_new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_gym_member_role"("p_gym_id" "uuid", "p_user_id" "uuid", "p_new_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_gym_display_key"("p_gym_id" "uuid", "p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_gym_display_key"("p_gym_id" "uuid", "p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_gym_display_key"("p_gym_id" "uuid", "p_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."app_languages" TO "anon";
GRANT ALL ON TABLE "public"."app_languages" TO "authenticated";
GRANT ALL ON TABLE "public"."app_languages" TO "service_role";



GRANT ALL ON TABLE "public"."app_translations" TO "anon";
GRANT ALL ON TABLE "public"."app_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."app_translations" TO "service_role";



GRANT ALL ON TABLE "public"."challenge_entries" TO "anon";
GRANT ALL ON TABLE "public"."challenge_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge_entries" TO "service_role";



GRANT ALL ON TABLE "public"."challenge_participants" TO "anon";
GRANT ALL ON TABLE "public"."challenge_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge_participants" TO "service_role";



GRANT ALL ON TABLE "public"."chat_rooms" TO "anon";
GRANT ALL ON TABLE "public"."chat_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_rooms" TO "service_role";



GRANT ALL ON TABLE "public"."communities" TO "anon";
GRANT ALL ON TABLE "public"."communities" TO "authenticated";
GRANT ALL ON TABLE "public"."communities" TO "service_role";



GRANT ALL ON TABLE "public"."community_members" TO "anon";
GRANT ALL ON TABLE "public"."community_members" TO "authenticated";
GRANT ALL ON TABLE "public"."community_members" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."custom_exercises" TO "anon";
GRANT ALL ON TABLE "public"."custom_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."event_participants" TO "anon";
GRANT ALL ON TABLE "public"."event_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."event_participants" TO "service_role";



GRANT ALL ON TABLE "public"."exercises" TO "anon";
GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises" TO "service_role";



GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON TABLE "public"."gym_challenges" TO "anon";
GRANT ALL ON TABLE "public"."gym_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."gym_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."gym_events" TO "anon";
GRANT ALL ON TABLE "public"."gym_events" TO "authenticated";
GRANT ALL ON TABLE "public"."gym_events" TO "service_role";



GRANT ALL ON TABLE "public"."gym_invites" TO "anon";
GRANT ALL ON TABLE "public"."gym_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."gym_invites" TO "service_role";



GRANT ALL ON TABLE "public"."gym_monitors" TO "anon";
GRANT ALL ON TABLE "public"."gym_monitors" TO "authenticated";
GRANT ALL ON TABLE "public"."gym_monitors" TO "service_role";



GRANT ALL ON TABLE "public"."gym_news" TO "anon";
GRANT ALL ON TABLE "public"."gym_news" TO "authenticated";
GRANT ALL ON TABLE "public"."gym_news" TO "service_role";



GRANT ALL ON TABLE "public"."gym_tv_settings" TO "anon";
GRANT ALL ON TABLE "public"."gym_tv_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."gym_tv_settings" TO "service_role";



GRANT ALL ON TABLE "public"."gyms" TO "anon";
GRANT ALL ON TABLE "public"."gyms" TO "authenticated";
GRANT ALL ON TABLE "public"."gyms" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."plan_assignments" TO "anon";
GRANT ALL ON TABLE "public"."plan_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."room_members" TO "anon";
GRANT ALL ON TABLE "public"."room_members" TO "authenticated";
GRANT ALL ON TABLE "public"."room_members" TO "service_role";



GRANT ALL ON TABLE "public"."streaks" TO "anon";
GRANT ALL ON TABLE "public"."streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."streaks" TO "service_role";



GRANT ALL ON TABLE "public"."trainer_relationships" TO "anon";
GRANT ALL ON TABLE "public"."trainer_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."trainer_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."user_gyms" TO "anon";
GRANT ALL ON TABLE "public"."user_gyms" TO "authenticated";
GRANT ALL ON TABLE "public"."user_gyms" TO "service_role";



GRANT ALL ON TABLE "public"."workout_likes" TO "anon";
GRANT ALL ON TABLE "public"."workout_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_likes" TO "service_role";



GRANT ALL ON TABLE "public"."workout_logs" TO "anon";
GRANT ALL ON TABLE "public"."workout_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_logs" TO "service_role";



GRANT ALL ON TABLE "public"."workout_plan_days" TO "anon";
GRANT ALL ON TABLE "public"."workout_plan_days" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_plan_days" TO "service_role";



GRANT ALL ON TABLE "public"."workout_plans" TO "anon";
GRANT ALL ON TABLE "public"."workout_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_plans" TO "service_role";



GRANT ALL ON TABLE "public"."workout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."workout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."workout_templates" TO "anon";
GRANT ALL ON TABLE "public"."workout_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_templates" TO "service_role";



GRANT ALL ON TABLE "public"."workouts" TO "anon";
GRANT ALL ON TABLE "public"."workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."workouts" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







