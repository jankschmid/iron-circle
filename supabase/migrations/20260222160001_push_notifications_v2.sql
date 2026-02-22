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

  -- Hardcoded URLs based on the extracted environment `.env.local`
  -- This bypasses any database permissions issues with ALTER DATABASE settings
  v_url := 'https://bhokgkxkkrofbpjqtijv.supabase.co/functions/v1/push-dispatcher';
  v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJob2tna3hra3JvZmJwanF0aWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMjM2NDQsImV4cCI6MjA4NDY5OTY0NH0.ig84DCCTAkntDMAuh9kfP0I1GPmtsgc9XO1GIj7fk4I';

  -- Fire-and-forget async POST request using pg_net
  SELECT net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := v_payload
  ) INTO v_req_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-----------------------------------------------------------
-- 3. APPLY SOCIAL TRIGGERS (Re-applying to ensure stability)
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
-- Unschedule the old one if it exists to replace it cleanly
SELECT cron.unschedule('push-retention-daily');

SELECT cron.schedule(
  'push-retention-daily',
  '0 17 * * *',
  $$
    SELECT net.http_post(
      url := 'https://bhokgkxkkrofbpjqtijv.supabase.co/functions/v1/push-retention',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJob2tna3hra3JvZmJwanF0aWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMjM2NDQsImV4cCI6MjA4NDY5OTY0NH0.ig84DCCTAkntDMAuh9kfP0I1GPmtsgc9XO1GIj7fk4I'
      )
    );
  $$
);
