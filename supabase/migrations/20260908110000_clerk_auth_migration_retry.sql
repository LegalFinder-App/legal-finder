-- Retry of 20260908090000_clerk_auth_migration.sql, which rolled back in its entirety: it
-- created has_role(_user_id TEXT, ...) — whose body compares user_roles.user_id = _user_id —
-- BEFORE retyping user_roles.user_id from UUID to TEXT, so Postgres rejected the CREATE FUNCTION
-- immediately with "operator does not exist: uuid = text" and aborted the whole transaction.
-- Supabase's migration tracker still marked that file as applied even though nothing in it
-- actually committed, which is why every identity column was found still UUID afterward. This
-- redoes the same work with has_role created AFTER the column retypes.
--
-- 20260908100000_fix_audit_log_record_id_type.sql (applied after, unaffected by this bug — no
-- policy referenced record_id, and its CREATE OR REPLACE FUNCTION is plpgsql, which doesn't
-- type-check table-column assignments at creation time) does NOT need to be redone here.

-- ============ 1. DROP every policy that references auth.uid()/has_role() ============

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
DROP POLICY IF EXISTS "incident_insert_anon" ON public.incident_reports;
DROP POLICY IF EXISTS "incident_insert_auth" ON public.incident_reports;
DROP POLICY IF EXISTS "incident_update" ON public.incident_reports;

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

-- ============ 2. Drop the old has_role() — recreated in step 5, AFTER column retyping ============

DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);

-- ============ 3. Truncate identity/transactional tables (disposable pre-launch data) ============

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

-- The rating/review_count zeroing below runs AFTER audit_logs.actor_id is retyped to TEXT
-- (see the end of section 4) — it fires audit_lawyers_trigger -> record_audit_log(), which
-- inserts a Clerk-id TEXT actor_identity into audit_logs.actor_id; doing it here, while that
-- column is still UUID, fails with "column actor_id is of type uuid but expression is of type
-- text" and rolls back the whole migration.

-- ============ 4. Drop every FK to auth.users, then retype identity columns to TEXT ============

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname, con.conrelid::regclass::text AS tbl
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    WHERE con.confrelid = 'auth.users'::regclass
      AND con.contype = 'f'
      AND ns.nspname = 'public'
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

UPDATE public.lawyers SET rating = 0, review_count = 0;

-- ============ 5. NOW create has_role() — user_roles.user_id is TEXT at this point ============

CREATE FUNCTION public.has_role(_user_id TEXT, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION public.has_role(TEXT, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT, public.app_role) TO anon, authenticated, service_role;

-- ============ 6. Recreate every policy against the Clerk claim ============

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
CREATE POLICY "incident_insert_anon" ON public.incident_reports FOR INSERT TO anon
  WITH CHECK (reporter_id IS NULL AND anonymous = true);
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

-- ============ 7. Storage policies ============

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

-- ============ 8. Retire the Supabase-Auth-only provisioning trigger ============

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
