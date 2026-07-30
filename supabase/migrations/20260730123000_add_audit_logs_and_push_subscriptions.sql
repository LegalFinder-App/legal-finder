-- Audit trail and browser push support for LegalFinder.

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_role TEXT,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  record_id UUID,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_actor_id_idx ON public.audit_logs (actor_id);
CREATE INDEX audit_logs_table_name_idx ON public.audit_logs (table_name);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_secret TEXT NOT NULL,
  device_name TEXT,
  platform TEXT NOT NULL DEFAULT 'web',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);
CREATE INDEX push_subscriptions_endpoint_idx ON public.push_subscriptions (endpoint);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscription_own" ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.record_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor_uuid UUID := auth.uid();
  actor_display_name TEXT := COALESCE(
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'full_name'), ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'name'), ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'email'), '')
  );
  actor_display_role TEXT := COALESCE(
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'requested_role'), '')
  );
  before_payload JSONB;
  after_payload JSONB;
  affected_record_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    before_payload := to_jsonb(OLD);
    affected_record_id := OLD.id;
  ELSE
    before_payload := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
    after_payload := to_jsonb(NEW);
    affected_record_id := NEW.id;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_name,
    actor_role,
    table_name,
    action,
    record_id,
    before_data,
    after_data,
    metadata
  ) VALUES (
    actor_uuid,
    actor_display_name,
    actor_display_role,
    TG_TABLE_NAME,
    TG_OP,
    affected_record_id,
    before_payload,
    after_payload,
    jsonb_build_object('source', TG_TABLE_SCHEMA, 'table', TG_TABLE_NAME)
  );

  RETURN COALESCE(NEW, OLD);
END; $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_profiles') THEN
    CREATE TRIGGER trg_audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_user_roles') THEN
    CREATE TRIGGER trg_audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_cases') THEN
    CREATE TRIGGER trg_audit_cases AFTER INSERT OR UPDATE OR DELETE ON public.cases
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_case_updates') THEN
    CREATE TRIGGER trg_audit_case_updates AFTER INSERT OR UPDATE OR DELETE ON public.case_updates
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_appointments') THEN
    CREATE TRIGGER trg_audit_appointments AFTER INSERT OR UPDATE OR DELETE ON public.appointments
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_documents') THEN
    CREATE TRIGGER trg_audit_documents AFTER INSERT OR UPDATE OR DELETE ON public.documents
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_messages') THEN
    CREATE TRIGGER trg_audit_messages AFTER INSERT OR UPDATE OR DELETE ON public.messages
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_notifications') THEN
    CREATE TRIGGER trg_audit_notifications AFTER INSERT OR UPDATE OR DELETE ON public.notifications
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_incidents') THEN
    CREATE TRIGGER trg_audit_incidents AFTER INSERT OR UPDATE OR DELETE ON public.incident_reports
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
END $$;
