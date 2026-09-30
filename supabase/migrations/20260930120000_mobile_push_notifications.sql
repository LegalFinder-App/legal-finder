-- Native app push notifications (apps/mobile). Device tokens are registered through
-- /api/mobile/push/register (service role), and every new notification or message is forwarded to
-- Expo's push service straight from the database, so delivery doesn't depend on which client or
-- server path wrote the row.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_push_tokens_user_idx ON public.device_push_tokens (user_id);

-- RLS on with no policies: only the service role (the mobile API routes) can read or write tokens.
ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.send_expo_push(p_user_id TEXT, p_title TEXT, p_body TEXT, p_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'to', token,
    'title', p_title,
    'body', p_body,
    'sound', 'default',
    'channelId', 'default',
    'data', jsonb_build_object('url', p_url)
  ))
  INTO payload
  FROM public.device_push_tokens
  WHERE user_id = p_user_id;

  IF payload IS NULL THEN
    RETURN;
  END IF;

  -- pg_net queues the request and returns immediately; the insert that fired this never waits on Expo.
  PERFORM net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := payload,
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  -- A push failure must never roll back the notification/message that triggered it.
  RAISE WARNING 'send_expo_push failed for %: %', p_user_id, SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.send_expo_push(NEW.user_id, NEW.title, COALESCE(NEW.body, ''), COALESCE(NEW.link, '/'));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.push_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient TEXT;
BEGIN
  SELECT CASE WHEN c.participant_a = NEW.sender_id THEN c.participant_b ELSE c.participant_a END
  INTO recipient
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  IF recipient IS NOT NULL AND recipient <> NEW.sender_id THEN
    -- Message text is confidential legal correspondence: never put it on a lock screen.
    PERFORM public.send_expo_push(
      recipient,
      'New message from ' || COALESCE(NEW.sender_name, 'LegalFinder'),
      'Open LegalFinder to read it.',
      '/messages/' || NEW.conversation_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- These run only from the triggers below; without this, any signed-in user could call
-- send_expo_push over the REST API and push arbitrary text to any other user's phone.
REVOKE ALL ON FUNCTION public.send_expo_push(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.push_on_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.push_on_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_push_on_notification ON public.notifications;
CREATE TRIGGER trg_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.push_on_notification();

DROP TRIGGER IF EXISTS trg_push_on_message ON public.messages;
CREATE TRIGGER trg_push_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.push_on_message();
