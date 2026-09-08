-- Migrate identity from Supabase Auth to Clerk (native Supabase Third-Party Auth integration).
-- Clerk user ids are strings like "user_2NNEq..." — not UUIDs — so every column that stores a
-- user identity must move from UUID to TEXT, and every policy must read the verified Clerk id
-- off the JWT via (auth.jwt()->>'sub') instead of auth.uid() (which assumes/casts UUID and would
-- error or never match against a Clerk id). Data is pre-launch and disposable, so the simplest
-- safe path is: drop the auth.uid()-based policies and the auth.users-tied trigger, truncate the
-- tables that store real Supabase-Auth-issued user ids (old rows can never belong to a Clerk user
-- again), retype those identity columns, then recreate the same policies against the Clerk claim.

-- ============ 1. DROP every policy that references auth.uid()/has_role() ============
-- (must happen before has_role's signature changes — Postgres won't drop a function a policy
-- still depends on)

DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;

DROP POLICY IF EXISTS "roles_read_own_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "roles_admin_insert" ON public.user_roles;
DROP POLICY IF EXISTS "roles_admin_update" ON public.user_roles;
DROP POLICY IF EXISTS "roles_admin_delete" ON public.user_roles;

DROP POLICY IF EXISTS "lawyers_self_manage" ON public.lawyers;

DROP POLICY IF EXISTS "reviews_own_write" ON public.reviews;

DROP POLICY IF EXISTS "cases_participants_read" ON public.cases;
DROP POLICY IF EXISTS "cases_client_insert" ON public.cases;
DROP POLICY IF EXISTS "cases_participants_update" ON public.cases;
DROP POLICY IF EXISTS "cases_owner_delete" ON public.cases;

DROP POLICY IF EXISTS "case_updates_read" ON public.case_updates;
DROP POLICY IF EXISTS "case_updates_insert" ON public.case_updates;
DROP POLICY IF EXISTS "case_updates_delete" ON public.case_updates;

DROP POLICY IF EXISTS "appts_read" ON public.appointments;
DROP POLICY IF EXISTS "appts_insert" ON public.appointments;
DROP POLICY IF EXISTS "appts_update" ON public.appointments;
DROP POLICY IF EXISTS "appts_delete" ON public.appointments;

DROP POLICY IF EXISTS "conv_read" ON public.conversations;
DROP POLICY IF EXISTS "conv_insert" ON public.conversations;
DROP POLICY IF EXISTS "conv_update" ON public.conversations;

DROP POLICY IF EXISTS "msg_read" ON public.messages;
DROP POLICY IF EXISTS "msg_insert" ON public.messages;
DROP POLICY IF EXISTS "msg_update" ON public.messages;

DROP POLICY IF EXISTS "docs_own" ON public.documents;

DROP POLICY IF EXISTS "notif_own" ON public.notifications;

DROP POLICY IF EXISTS "advice_read_published" ON public.legal_advices;
DROP POLICY IF EXISTS "advice_read_admin" ON public.legal_advices;
DROP POLICY IF EXISTS "advice_write" ON public.legal_advices;

DROP POLICY IF EXISTS "news_read_admin" ON public.news_posts;
DROP POLICY IF EXISTS "news_write" ON public.news_posts;

DROP POLICY IF EXISTS "quotes_write" ON public.quotes;
DROP POLICY IF EXISTS "tips_write" ON public.security_tips;
DROP POLICY IF EXISTS "library_write" ON public.library_items;

DROP POLICY IF EXISTS "judg_read_published" ON public.judgements;
DROP POLICY IF EXISTS "judg_read_admin" ON public.judgements;
DROP POLICY IF EXISTS "judg_write" ON public.judgements;

DROP POLICY IF EXISTS "stations_write" ON public.police_stations;
DROP POLICY IF EXISTS "wanted_write" ON public.wanted_persons;

DROP POLICY IF EXISTS "incident_read" ON public.incident_reports;
DROP POLICY IF EXISTS "incident_insert_auth" ON public.incident_reports;
DROP POLICY IF EXISTS "incident_update" ON public.incident_reports;
-- incident_insert_anon never used auth.uid() — left untouched.

DROP POLICY IF EXISTS "audit_admin_read" ON public.audit_logs;
DROP POLICY IF EXISTS "push_subscription_own" ON public.push_subscriptions;

DROP POLICY IF EXISTS "payments_read" ON public.payments;
DROP POLICY IF EXISTS "payments_client_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_admin_update" ON public.payments;

DROP POLICY IF EXISTS "docs_own_read" ON storage.objects;
DROP POLICY IF EXISTS "docs_own_insert" ON storage.objects;
DROP POLICY IF EXISTS "docs_own_update" ON storage.objects;
DROP POLICY IF EXISTS "docs_own_delete" ON storage.objects;
DROP POLICY IF EXISTS "media_read" ON storage.objects;
DROP POLICY IF EXISTS "media_insert" ON storage.objects;
DROP POLICY IF EXISTS "media_update" ON storage.objects;
DROP POLICY IF EXISTS "media_delete" ON storage.objects;

-- ============ 2. Retype has_role() from UUID to TEXT ============
-- CREATE OR REPLACE cannot change a parameter type — it would create a second overloaded
-- function and leave the UUID-typed original dangling. Drop it explicitly first.

DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);

CREATE FUNCTION public.has_role(_user_id TEXT, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION public.has_role(TEXT, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT, public.app_role) TO anon, authenticated, service_role;

-- ============ 3. Truncate identity/transactional tables ============
-- Disposable pre-launch data — old rows reference Supabase-Auth UUIDs that can never be a Clerk
-- user again, so a clean slate is simpler and safer than trying to cast/preserve them.
-- NOT truncated: lawyers (seeded demo rows never set user_id — verified against the seed
-- migration) and the pure content tables (legal_advices, news_posts, judgements, wanted_persons,
-- police_stations, quotes, security_tips, library_items) — their author columns are nullable
-- metadata; truncating would destroy seeded demo/presentation content for no benefit.

TRUNCATE TABLE
  public.profiles,
  public.user_roles,
  public.reviews,
  public.cases,
  public.case_updates,
  public.appointments,
  public.conversations,
  public.messages,
  public.documents,
  public.notifications,
  public.payments,
  public.push_subscriptions,
  public.audit_logs,
  public.incident_reports;

-- reviews is truncated but lawyers isn't — the rating-refresh trigger doesn't fire on TRUNCATE,
-- so the aggregate columns would otherwise be left stale.
UPDATE public.lawyers SET rating = 0, review_count = 0;

-- ============ 4. Drop every FK to auth.users, then retype identity columns to TEXT ============
-- Dynamic lookup instead of hardcoded constraint names — Postgres's default naming
-- (<table>_<column>_fkey) almost certainly holds since none were explicitly named, but this
-- avoids depending on that guess entirely.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname, con.conrelid::regclass::text AS tbl
    FROM pg_constraint con
    WHERE con.confrelid = 'auth.users'::regclass
      AND con.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.user_roles ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.lawyers ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.reviews ALTER COLUMN author_id TYPE TEXT USING author_id::text;
ALTER TABLE public.cases ALTER COLUMN client_id TYPE TEXT USING client_id::text;
ALTER TABLE public.cases ALTER COLUMN lawyer_id TYPE TEXT USING lawyer_id::text;
ALTER TABLE public.case_updates ALTER COLUMN author_id TYPE TEXT USING author_id::text;
ALTER TABLE public.appointments ALTER COLUMN client_id TYPE TEXT USING client_id::text;
ALTER TABLE public.appointments ALTER COLUMN lawyer_id TYPE TEXT USING lawyer_id::text;
ALTER TABLE public.conversations ALTER COLUMN participant_a TYPE TEXT USING participant_a::text;
ALTER TABLE public.conversations ALTER COLUMN participant_b TYPE TEXT USING participant_b::text;
ALTER TABLE public.messages ALTER COLUMN sender_id TYPE TEXT USING sender_id::text;
ALTER TABLE public.documents ALTER COLUMN owner_id TYPE TEXT USING owner_id::text;
ALTER TABLE public.notifications ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.legal_advices ALTER COLUMN author_id TYPE TEXT USING author_id::text;
ALTER TABLE public.news_posts ALTER COLUMN author_id TYPE TEXT USING author_id::text;
ALTER TABLE public.judgements ALTER COLUMN uploaded_by TYPE TEXT USING uploaded_by::text;
ALTER TABLE public.wanted_persons ALTER COLUMN posted_by TYPE TEXT USING posted_by::text;
ALTER TABLE public.incident_reports ALTER COLUMN reporter_id TYPE TEXT USING reporter_id::text;
ALTER TABLE public.audit_logs ALTER COLUMN actor_id TYPE TEXT USING actor_id::text;
ALTER TABLE public.push_subscriptions ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.payments ALTER COLUMN client_id TYPE TEXT USING client_id::text;
ALTER TABLE public.payments ALTER COLUMN lawyer_id TYPE TEXT USING lawyer_id::text;

-- profiles.requested_role and its enum default are unaffected — only identity columns retype.

-- ============ 5. Recreate every policy against the Clerk claim ============

CREATE POLICY "profiles_own_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->>'sub') = id);
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE TO authenticated
  USING ((auth.jwt()->>'sub') = id) WITH CHECK ((auth.jwt()->>'sub') = id);

CREATE POLICY "roles_read_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));
CREATE POLICY "roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin'));
CREATE POLICY "roles_admin_update" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'))
  WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin'));
CREATE POLICY "roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE POLICY "lawyers_self_manage" ON public.lawyers FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'))
  WITH CHECK (user_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE POLICY "reviews_own_write" ON public.reviews FOR ALL TO authenticated
  USING (author_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'))
  WITH CHECK (author_id = (auth.jwt()->>'sub'));

CREATE POLICY "cases_participants_read" ON public.cases FOR SELECT TO authenticated
  USING (client_id = (auth.jwt()->>'sub') OR lawyer_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));
CREATE POLICY "cases_client_insert" ON public.cases FOR INSERT TO authenticated
  WITH CHECK (client_id = (auth.jwt()->>'sub'));
CREATE POLICY "cases_participants_update" ON public.cases FOR UPDATE TO authenticated
  USING (client_id = (auth.jwt()->>'sub') OR lawyer_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));
CREATE POLICY "cases_owner_delete" ON public.cases FOR DELETE TO authenticated
  USING (client_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE POLICY "case_updates_read" ON public.case_updates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.client_id = (auth.jwt()->>'sub') OR c.lawyer_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'))));
CREATE POLICY "case_updates_insert" ON public.case_updates FOR INSERT TO authenticated
  WITH CHECK (author_id = (auth.jwt()->>'sub') AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.client_id = (auth.jwt()->>'sub') OR c.lawyer_id = (auth.jwt()->>'sub'))));
CREATE POLICY "case_updates_delete" ON public.case_updates FOR DELETE TO authenticated
  USING (author_id = (auth.jwt()->>'sub'));

CREATE POLICY "appts_read" ON public.appointments FOR SELECT TO authenticated
  USING (client_id = (auth.jwt()->>'sub') OR lawyer_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin') OR public.has_role((auth.jwt()->>'sub'), 'judiciary'));
CREATE POLICY "appts_insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (client_id = (auth.jwt()->>'sub'));
CREATE POLICY "appts_update" ON public.appointments FOR UPDATE TO authenticated
  USING (client_id = (auth.jwt()->>'sub') OR lawyer_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));
CREATE POLICY "appts_delete" ON public.appointments FOR DELETE TO authenticated
  USING (client_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE POLICY "conv_read" ON public.conversations FOR SELECT TO authenticated
  USING (participant_a = (auth.jwt()->>'sub') OR participant_b = (auth.jwt()->>'sub'));
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (participant_a = (auth.jwt()->>'sub') OR participant_b = (auth.jwt()->>'sub'));
CREATE POLICY "conv_update" ON public.conversations FOR UPDATE TO authenticated
  USING (participant_a = (auth.jwt()->>'sub') OR participant_b = (auth.jwt()->>'sub'));

CREATE POLICY "msg_read" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_a = (auth.jwt()->>'sub') OR c.participant_b = (auth.jwt()->>'sub'))));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = (auth.jwt()->>'sub') AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_a = (auth.jwt()->>'sub') OR c.participant_b = (auth.jwt()->>'sub'))));
CREATE POLICY "msg_update" ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_a = (auth.jwt()->>'sub') OR c.participant_b = (auth.jwt()->>'sub'))));

CREATE POLICY "docs_own" ON public.documents FOR ALL TO authenticated
  USING (owner_id = (auth.jwt()->>'sub')) WITH CHECK (owner_id = (auth.jwt()->>'sub'));

CREATE POLICY "notif_own" ON public.notifications FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub')) WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "advice_read_published" ON public.legal_advices FOR SELECT TO anon, authenticated
  USING (published = true OR author_id = (auth.jwt()->>'sub'));
CREATE POLICY "advice_read_admin" ON public.legal_advices FOR SELECT TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'));
CREATE POLICY "advice_write" ON public.legal_advices FOR ALL TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin') OR public.has_role((auth.jwt()->>'sub'), 'lawyer'))
  WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin') OR public.has_role((auth.jwt()->>'sub'), 'lawyer'));

CREATE POLICY "news_read_admin" ON public.news_posts FOR SELECT TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'));
CREATE POLICY "news_write" ON public.news_posts FOR ALL TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin')) WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE POLICY "quotes_write" ON public.quotes FOR ALL TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin')) WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE POLICY "tips_write" ON public.security_tips FOR ALL TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin') OR public.has_role((auth.jwt()->>'sub'), 'police'))
  WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin') OR public.has_role((auth.jwt()->>'sub'), 'police'));

CREATE POLICY "library_write" ON public.library_items FOR ALL TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin')) WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE POLICY "judg_read_published" ON public.judgements FOR SELECT TO anon, authenticated
  USING (published = true OR uploaded_by = (auth.jwt()->>'sub'));
CREATE POLICY "judg_read_admin" ON public.judgements FOR SELECT TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'));
CREATE POLICY "judg_write" ON public.judgements FOR ALL TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'judiciary') OR public.has_role((auth.jwt()->>'sub'), 'admin'))
  WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'judiciary') OR public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE POLICY "stations_write" ON public.police_stations FOR ALL TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin') OR public.has_role((auth.jwt()->>'sub'), 'police'))
  WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin') OR public.has_role((auth.jwt()->>'sub'), 'police'));

CREATE POLICY "wanted_write" ON public.wanted_persons FOR ALL TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'police') OR public.has_role((auth.jwt()->>'sub'), 'admin'))
  WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'police') OR public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE POLICY "incident_read" ON public.incident_reports FOR SELECT TO authenticated
  USING (reporter_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'police') OR public.has_role((auth.jwt()->>'sub'), 'admin'));
CREATE POLICY "incident_insert_auth" ON public.incident_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id IS NULL OR reporter_id = (auth.jwt()->>'sub'));
CREATE POLICY "incident_update" ON public.incident_reports FOR UPDATE TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'police') OR public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE POLICY "push_subscription_own" ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub')) WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "payments_read" ON public.payments FOR SELECT TO authenticated
  USING (client_id = (auth.jwt()->>'sub') OR lawyer_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));
CREATE POLICY "payments_client_insert" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (client_id = (auth.jwt()->>'sub'));
CREATE POLICY "payments_admin_update" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin')) WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin'));

-- ============ 6. Storage policies ============

CREATE POLICY "docs_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (auth.jwt()->>'sub') = (storage.foldername(name))[1]);
CREATE POLICY "docs_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (auth.jwt()->>'sub') = (storage.foldername(name))[1]);
CREATE POLICY "docs_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (auth.jwt()->>'sub') = (storage.foldername(name))[1]);
CREATE POLICY "docs_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (auth.jwt()->>'sub') = (storage.foldername(name))[1]);

CREATE POLICY "media_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND (auth.jwt()->>'sub') = (storage.foldername(name))[1]);
CREATE POLICY "media_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (auth.jwt()->>'sub') = (storage.foldername(name))[1]);
CREATE POLICY "media_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND (auth.jwt()->>'sub') = (storage.foldername(name))[1]);
CREATE POLICY "media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (auth.jwt()->>'sub') = (storage.foldername(name))[1]);

-- ============ 7. Fix the audit trigger's actor identity ============

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

-- ============ 8. Retire the Supabase-Auth-only provisioning trigger ============
-- Clerk users never produce an auth.users row, so this will never fire again. Replaced by lazy
-- provisioning in the new Clerk auth middleware / _authenticated route beforeLoad.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
