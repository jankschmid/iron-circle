-- Enable extensions for network requests and cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-----------------------------------------------------------
-- 1. RETENTION RPC: Used by the daily push-retention cron
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_inactive_users_for_retention()
RETURNS TABLE(user_id uuid, push_token text) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.push_token
  FROM profiles p
  WHERE p.push_token IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.user_id = p.id
    AND ws.end_time >= NOW() - INTERVAL '48 hours'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-----------------------------------------------------------
-- 2. PUSH DISPATCHER GENERIC WEBHOOK
-----------------------------------------------------------
-- This function sends a standard webhook payload to our Edge Function.
CREATE OR REPLACE FUNCTION notify_push_dispatcher()
RETURNS TRIGGER AS $$
DECLARE
  v_url text;
  v_anon_key text;
  v_payload jsonb;
  v_req_id bigint;
BEGIN
  -- Build the generic Supabase Webhook payload
  v_payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', row_to_json(OLD)
  );

  -- Retrieve external routing from Custom App Settings (set via Supabase Dashboard -> Database -> PostgreSQL Settings -> Custom)
  v_url := current_setting('app.settings.push_dispatcher_url', true);
  v_anon_key := current_setting('app.settings.anon_key', true);

  -- Fallback for local development if settings are not defined
  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'http://api.supabase.internal:8000/functions/v1/push-dispatcher';
  END IF;

  -- Fire-and-forget async POST request using pg_net
  SELECT net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_anon_key, 'anon')
      ),
      body := v_payload
  ) INTO v_req_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-----------------------------------------------------------
-- 3. APPLY SOCIAL TRIGGERS
-----------------------------------------------------------

-- Chats
DROP TRIGGER IF EXISTS messages_push_trigger ON messages;
CREATE TRIGGER messages_push_trigger
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION notify_push_dispatcher();

-- Friend Requests
DROP TRIGGER IF EXISTS friendships_push_trigger ON friendships;
CREATE TRIGGER friendships_push_trigger
AFTER INSERT OR UPDATE ON friendships
FOR EACH ROW EXECUTE FUNCTION notify_push_dispatcher();

-- Feed Interactions (Fistbumps/Comments)
DROP TRIGGER IF EXISTS feed_interactions_push_trigger ON feed_interactions;
CREATE TRIGGER feed_interactions_push_trigger
AFTER INSERT ON feed_interactions
FOR EACH ROW EXECUTE FUNCTION notify_push_dispatcher();


-----------------------------------------------------------
-- 4. PG_CRON RETENTION SCHEDULE (Daily at 17:00 UTC)
-----------------------------------------------------------
-- Note: The cron job makes a GET or POST to the retention Edge Function.
-- The retention edge function handles its own database queries.

SELECT cron.schedule(
  'push-retention-daily',
  '0 17 * * *',
  $$
    SELECT net.http_post(
      url := COALESCE(current_setting('app.settings.push_retention_url', true), 'http://api.supabase.internal:8000/functions/v1/push-retention'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.anon_key', true), 'anon')
      )
    );
  $$
);
