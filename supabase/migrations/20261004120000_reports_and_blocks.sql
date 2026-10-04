-- Reporting and blocking. App Store guideline 1.2: an app where people post content others see
-- (messages, reviews) must let them report objectionable content and block abusive users, and
-- the developer must act on reports. People report a message, a review or a person; administrators
-- are notified and work through the reports. A block stops either person starting a conversation
-- with, or messaging, the other.
--
-- Blocks are enforced by triggers, not by the messages/conversations RLS policies: the two Clerk
-- auth migrations re-apply on every `npm run db:migrate` and recreate those policies from their
-- own text, which would silently drop a block check written into them.

-- ============ Reports ============
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id TEXT NOT NULL,                  -- Clerk sub
  target_type TEXT NOT NULL CHECK (target_type IN ('message', 'review', 'user')),
  target_id TEXT NOT NULL,                    -- the message or review id, or the person's Clerk id
  reported_user_id TEXT,                      -- who wrote it; filled in by the trigger below
  reason TEXT NOT NULL CHECK (reason IN ('harassment', 'spam', 'offensive', 'fraud', 'other')),
  details TEXT CHECK (char_length(details) <= 2000),
  excerpt TEXT,                               -- the reported text as it was, from the database
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution_note TEXT CHECK (char_length(resolution_note) <= 2000),
  handled_by TEXT,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports (status, created_at DESC);

DROP POLICY IF EXISTS "reports_insert_own" ON public.content_reports;
CREATE POLICY "reports_insert_own" ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (auth.jwt()->>'sub'));
DROP POLICY IF EXISTS "reports_read" ON public.content_reports;
CREATE POLICY "reports_read" ON public.content_reports FOR SELECT TO authenticated
  USING (reporter_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));
DROP POLICY IF EXISTS "reports_admin_update" ON public.content_reports;
CREATE POLICY "reports_admin_update" ON public.content_reports FOR UPDATE TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'))
  WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin'));

-- The reported text and its author come from the database, not from the reporter: administrators
-- can't read other people's messages, so the report keeps an exact copy. A message can only be
-- reported by someone in its conversation.
CREATE OR REPLACE FUNCTION public.fill_content_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.target_type = 'message' THEN
    SELECT m.body, m.sender_id::text INTO NEW.excerpt, NEW.reported_user_id
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id::text = NEW.target_id
      AND (c.participant_a::text = NEW.reporter_id OR c.participant_b::text = NEW.reporter_id);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That message can''t be reported.' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.target_type = 'review' THEN
    SELECT r.comment, r.author_id::text INTO NEW.excerpt, NEW.reported_user_id
    FROM public.reviews r WHERE r.id::text = NEW.target_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That review no longer exists.' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    NEW.reported_user_id := NEW.target_id;
    NEW.excerpt := NULL;
  END IF;
  IF NEW.reported_user_id = NEW.reporter_id THEN
    RAISE EXCEPTION 'You can''t report yourself.' USING ERRCODE = 'P0001';
  END IF;
  NEW.excerpt := left(NEW.excerpt, 2000);
  NEW.status := 'open';
  NEW.handled_by := NULL;
  NEW.handled_at := NULL;
  NEW.resolution_note := NULL;
  NEW.created_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_fill_content_report ON public.content_reports;
CREATE TRIGGER trg_fill_content_report BEFORE INSERT ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.fill_content_report();

-- Every administrator gets an in-app notification for each new report.
CREATE OR REPLACE FUNCTION public.notify_admins_of_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, kind, link)
  SELECT DISTINCT ur.user_id,
         'New report to review',
         'A ' || NEW.target_type || ' was reported for ' || NEW.reason || '.',
         'report',
         '/admin/reports'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_admins_of_report ON public.content_reports;
CREATE TRIGGER trg_notify_admins_of_report AFTER INSERT ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_report();

-- ============ Blocks ============
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
DROP POLICY IF EXISTS "blocks_own" ON public.user_blocks;
CREATE POLICY "blocks_own" ON public.user_blocks FOR ALL TO authenticated
  USING (blocker_id = (auth.jwt()->>'sub'))
  WITH CHECK (blocker_id = (auth.jwt()->>'sub'));

CREATE OR REPLACE FUNCTION public.blocked_between(a TEXT, b TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = a AND blocked_id = b) OR (blocker_id = b AND blocked_id = a)
  );
$$;
-- Only the triggers below call it; it is not part of the API.
REVOKE ALL ON FUNCTION public.blocked_between(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_conversation_blocks()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.blocked_between(NEW.participant_a::text, NEW.participant_b::text) THEN
    RAISE EXCEPTION 'You can''t message this person.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_conversation_blocks ON public.conversations;
CREATE TRIGGER trg_conversation_blocks BEFORE INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_conversation_blocks();

CREATE OR REPLACE FUNCTION public.enforce_message_blocks()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  other TEXT;
BEGIN
  SELECT CASE WHEN c.participant_a::text = NEW.sender_id::text THEN c.participant_b::text
              ELSE c.participant_a::text END
    INTO other
  FROM public.conversations c WHERE c.id = NEW.conversation_id;
  IF other IS NOT NULL AND public.blocked_between(NEW.sender_id::text, other) THEN
    RAISE EXCEPTION 'You can''t message this person.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_message_blocks ON public.messages;
CREATE TRIGGER trg_message_blocks BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_blocks();
