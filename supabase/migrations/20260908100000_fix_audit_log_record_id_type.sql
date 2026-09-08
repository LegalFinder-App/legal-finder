-- The previous migration retyped every user-identity column to TEXT, including profiles.id
-- (which holds the Clerk user id, not an independently-generated UUID). record_audit_log()
-- assigns NEW.id/OLD.id to a UUID-typed PL/pgSQL variable and audit_logs.record_id was left as
-- UUID — fine for tables whose id is a real generated UUID (cases, documents, ...), but the
-- very first write to `profiles` (via lazy provisioning on a user's first sign-in) now assigns a
-- Clerk id string there, and Postgres's implicit UUID cast fails: "invalid input syntax for type
-- uuid: \"user_...\"". Widen record_id to TEXT (a strict superset — every existing UUID value is
-- already valid text) and match the trigger's variable type.

ALTER TABLE public.audit_logs ALTER COLUMN record_id TYPE TEXT USING record_id::text;

CREATE OR REPLACE FUNCTION public.record_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor_identity TEXT := auth.jwt()->>'sub';
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
  affected_record_id TEXT;
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
    actor_identity,
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
