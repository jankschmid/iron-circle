-- Migration to add Webhooks for Push Notifications
-- Triggers whenever a row is inserted in 'messages' or 'friendships'

-- Note: We assume the 'http' extension is enabled in Supabase by default for pg_net, 
-- but Supabase Webhooks are easiest implemented directly via the Dashboard or using pg_net.
-- Here we use the native Supabase webhook trigger using the 'http_request' function.

create extension if not exists "http" with schema "extensions";

CREATE OR REPLACE FUNCTION notify_push_dispatcher()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_payload jsonb;
  v_response int;
BEGIN
  -- We fetch the base URL for edge functions. Usually mapped in secrets or hardcoded for the project.
  -- To keep it generic, we'll construct the payload and let the pg_net POST it.
  
  -- The payload format matching edge function expectation:
  v_payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW)
  );
  
  -- Fire and forget async request using pg_net (returns request id)
  -- Requires `pg_net` extension which is standard on Supabase
  PERFORM net.http_post(
      url:='https://lytqysuvlrydtnssvnvh.supabase.co/functions/v1/push-dispatcher',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.anon_key', true) || '"}'::jsonb,
      body:=v_payload
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Push notification dispatch failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS on_message_insert ON messages;
DROP TRIGGER IF EXISTS on_friendship_insert_update ON friendships;

-- Create triggers
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_dispatcher();

CREATE TRIGGER on_friendship_insert_update
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_dispatcher();
