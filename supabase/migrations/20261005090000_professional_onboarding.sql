-- Professional onboarding: an advocate, police or judiciary account is granted only by an
-- administrator approving an application that carries the required details and documents.
--
-- Before this, the role picked at sign-up was only saved as profiles.requested_role, everyone
-- became a client, and an admin could grant any role by hand with nothing on file — so people
-- who joined as advocates "became clients", and nothing was checked.
--
--   role_applications            one per person and role: details (jsonb) + a status
--   role_application_documents   the files, kept in the private "onboarding" bucket
--   submit_role_application()    applicant: checks everything required is there, notifies admins
--   review_role_application()    admin: approve (grants the role; an advocate also gets a verified
--                                directory listing), ask for changes, or reject; notifies the person
--
-- Status only changes through those two functions (no column grant on it). The required lists
-- below are mirrored, with labels, in src/lib/onboarding.ts and apps/mobile/src/lib/onboarding.ts.
--
-- Triggers rather than policies on user_roles/lawyers, because the two Clerk auth migrations
-- re-apply on every db:migrate and recreate those tables' policies.

-- ============ Applications ============

CREATE TABLE IF NOT EXISTS public.role_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  role public.app_role NOT NULL CHECK (role IN ('lawyer', 'police', 'judiciary')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'changes_requested', 'approved', 'rejected')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(details) = 'object' AND length(details::text) <= 8000),
  review_note TEXT CHECK (char_length(review_note) <= 2000),
  submitted_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX IF NOT EXISTS role_applications_status_idx
  ON public.role_applications (status, submitted_at);

REVOKE ALL ON public.role_applications FROM anon, authenticated;
GRANT SELECT, DELETE ON public.role_applications TO authenticated;
GRANT INSERT (user_id, role, details) ON public.role_applications TO authenticated;
GRANT UPDATE (details) ON public.role_applications TO authenticated;
GRANT ALL ON public.role_applications TO service_role;
ALTER TABLE public.role_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_read" ON public.role_applications;
CREATE POLICY "applications_read" ON public.role_applications FOR SELECT TO authenticated
  USING (user_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));

DROP POLICY IF EXISTS "applications_insert_own" ON public.role_applications;
CREATE POLICY "applications_insert_own" ON public.role_applications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (auth.jwt()->>'sub')
    AND NOT public.has_role((auth.jwt()->>'sub'), role)
  );

DROP POLICY IF EXISTS "applications_update_own" ON public.role_applications;
CREATE POLICY "applications_update_own" ON public.role_applications FOR UPDATE TO authenticated
  USING (user_id = (auth.jwt()->>'sub') AND status IN ('draft', 'changes_requested'))
  WITH CHECK (user_id = (auth.jwt()->>'sub') AND status IN ('draft', 'changes_requested'));

DROP POLICY IF EXISTS "applications_delete_draft" ON public.role_applications;
CREATE POLICY "applications_delete_draft" ON public.role_applications FOR DELETE TO authenticated
  USING (user_id = (auth.jwt()->>'sub') AND status = 'draft');

DROP TRIGGER IF EXISTS trg_role_applications_updated ON public.role_applications;
CREATE TRIGGER trg_role_applications_updated BEFORE UPDATE ON public.role_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Documents ============

CREATE TABLE IF NOT EXISTS public.role_application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.role_applications(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind ~ '^[a-z_]{2,40}$'),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS role_application_documents_app_idx
  ON public.role_application_documents (application_id);

REVOKE ALL ON public.role_application_documents FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.role_application_documents TO authenticated;
GRANT ALL ON public.role_application_documents TO service_role;
ALTER TABLE public.role_application_documents ENABLE ROW LEVEL SECURITY;

-- Files can be added or removed only while the application can still be edited, and only under
-- the applicant's own folder for that application: <user id>/<application id>/<file>.
CREATE OR REPLACE FUNCTION public.can_edit_role_application(_application_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_applications a
    WHERE a.id = _application_id
      AND a.user_id = (auth.jwt()->>'sub')
      AND a.status IN ('draft', 'changes_requested')
  );
$$;

DROP POLICY IF EXISTS "application_documents_read" ON public.role_application_documents;
CREATE POLICY "application_documents_read" ON public.role_application_documents
  FOR SELECT TO authenticated
  USING (user_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));

DROP POLICY IF EXISTS "application_documents_insert" ON public.role_application_documents;
CREATE POLICY "application_documents_insert" ON public.role_application_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (auth.jwt()->>'sub')
    AND public.can_edit_role_application(application_id)
    AND storage_path LIKE (auth.jwt()->>'sub') || '/' || application_id::text || '/%'
  );

DROP POLICY IF EXISTS "application_documents_delete" ON public.role_application_documents;
CREATE POLICY "application_documents_delete" ON public.role_application_documents
  FOR DELETE TO authenticated
  USING (user_id = (auth.jwt()->>'sub') AND public.can_edit_role_application(application_id));

-- ============ Private bucket for the files ============

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding', 'onboarding', false, 10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "onboarding_read" ON storage.objects;
CREATE POLICY "onboarding_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'onboarding'
    AND ((auth.jwt()->>'sub') = (storage.foldername(name))[1]
         OR public.has_role((auth.jwt()->>'sub'), 'admin'))
  );

DROP POLICY IF EXISTS "onboarding_insert" ON storage.objects;
CREATE POLICY "onboarding_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'onboarding'
    AND (auth.jwt()->>'sub') = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.role_applications a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.user_id = (auth.jwt()->>'sub')
        AND a.status IN ('draft', 'changes_requested')
    )
  );

DROP POLICY IF EXISTS "onboarding_delete" ON storage.objects;
CREATE POLICY "onboarding_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'onboarding'
    AND (auth.jwt()->>'sub') = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.role_applications a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.user_id = (auth.jwt()->>'sub')
        AND a.status IN ('draft', 'changes_requested')
    )
  );

-- ============ What each role must provide ============

CREATE OR REPLACE FUNCTION public.role_application_requirements(_role public.app_role)
RETURNS TABLE (fields TEXT[], documents TEXT[])
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE _role
      WHEN 'lawyer' THEN ARRAY['full_name', 'roll_number', 'practising_certificate_number',
                               'practising_certificate_expiry', 'firm', 'district', 'phone']
      WHEN 'police' THEN ARRAY['full_name', 'force_number', 'rank', 'station', 'district', 'phone']
      WHEN 'judiciary' THEN ARRAY['full_name', 'position', 'court', 'staff_number', 'phone']
      ELSE ARRAY[]::TEXT[]
    END,
    CASE _role
      WHEN 'lawyer' THEN ARRAY['practising_certificate', 'enrolment_certificate', 'national_id']
      WHEN 'police' THEN ARRAY['police_id', 'authorisation_letter', 'national_id']
      WHEN 'judiciary' THEN ARRAY['staff_id', 'appointment_letter', 'national_id']
      ELSE ARRAY[]::TEXT[]
    END;
$$;

CREATE OR REPLACE FUNCTION public.role_label(_role public.app_role)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _role
    WHEN 'lawyer' THEN 'advocate'
    WHEN 'police' THEN 'police'
    WHEN 'judiciary' THEN 'judiciary'
    WHEN 'admin' THEN 'administrator'
    ELSE 'client'
  END;
$$;

-- ============ Submit (applicant) ============

CREATE OR REPLACE FUNCTION public.submit_role_application(_application_id UUID)
RETURNS public.role_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app public.role_applications;
  req RECORD;
  missing TEXT[];
  expiry TEXT;
BEGIN
  SELECT * INTO app FROM public.role_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND OR app.user_id IS DISTINCT FROM (auth.jwt()->>'sub') THEN
    RAISE EXCEPTION 'Application not found.';
  END IF;
  IF app.status NOT IN ('draft', 'changes_requested') THEN
    RAISE EXCEPTION 'This application has already been sent.';
  END IF;

  SELECT * INTO req FROM public.role_application_requirements(app.role);
  missing := ARRAY(
    SELECT replace(f, '_', ' ') FROM unnest(req.fields) AS f
    WHERE coalesce(btrim(app.details->>f), '') = ''
  ) || ARRAY(
    SELECT replace(d, '_', ' ') FROM unnest(req.documents) AS d
    WHERE NOT EXISTS (
      SELECT 1 FROM public.role_application_documents x
      WHERE x.application_id = app.id AND x.kind = d
    )
  );
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'Your application is missing: %.', array_to_string(missing, ', ')
      USING ERRCODE = 'check_violation';
  END IF;

  IF app.role = 'lawyer' THEN
    expiry := app.details->>'practising_certificate_expiry';
    IF expiry !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'Enter the practising certificate''s expiry date.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF expiry::date < current_date THEN
      RAISE EXCEPTION 'Your practising certificate has expired. Upload the current one.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  UPDATE public.role_applications
    SET status = 'submitted', submitted_at = now()
    WHERE id = app.id
    RETURNING * INTO app;

  INSERT INTO public.notifications (user_id, title, body, kind, link)
  SELECT DISTINCT ur.user_id,
         'New ' || public.role_label(app.role) || ' application',
         coalesce(nullif(btrim(app.details->>'full_name'), ''), 'Someone')
           || ' applied for a ' || public.role_label(app.role) || ' account.',
         'application',
         '/admin/applications'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN app;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_role_application(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_role_application(UUID) TO authenticated;

-- ============ Review (administrator) ============

CREATE OR REPLACE FUNCTION public.review_role_application(
  _application_id UUID,
  _decision TEXT,
  _note TEXT DEFAULT NULL
)
RETURNS public.role_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller TEXT := auth.jwt()->>'sub';
  app public.role_applications;
  note TEXT := nullif(btrim(coalesce(_note, '')), '');
  label TEXT;
  expiry DATE;
BEGIN
  IF NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Only an administrator can review applications.';
  END IF;
  IF _decision NOT IN ('approve', 'changes', 'reject') THEN
    RAISE EXCEPTION 'Unknown decision.';
  END IF;
  IF _decision <> 'approve' AND note IS NULL THEN
    RAISE EXCEPTION 'Say what the applicant needs to know.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO app FROM public.role_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found.';
  END IF;
  IF app.status <> 'submitted' THEN
    RAISE EXCEPTION 'This application isn''t waiting for review.';
  END IF;

  UPDATE public.role_applications
    SET status = CASE _decision
                   WHEN 'approve' THEN 'approved'
                   WHEN 'changes' THEN 'changes_requested'
                   ELSE 'rejected'
                 END,
        review_note = note,
        reviewed_by = caller,
        reviewed_at = now()
    WHERE id = app.id
    RETURNING * INTO app;

  label := public.role_label(app.role);

  IF _decision = 'approve' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (app.user_id, app.role)
      ON CONFLICT (user_id, role) DO NOTHING;

    IF app.role = 'lawyer' THEN
      expiry := CASE WHEN app.details->>'practising_certificate_expiry' ~ '^\d{4}-\d{2}-\d{2}$'
                     THEN (app.details->>'practising_certificate_expiry')::date END;
      IF EXISTS (SELECT 1 FROM public.lawyers WHERE user_id = app.user_id) THEN
        UPDATE public.lawyers
          SET verified = true,
              bar_number = app.details->>'roll_number',
              bar_license_expires_at = expiry,
              license_status = CASE WHEN expiry >= current_date THEN 'active'
                                    ELSE license_status END
          WHERE user_id = app.user_id;
      ELSE
        -- Checked credentials make a verified listing. It starts closed to new clients, so it
        -- doesn't advertise fees or availability until the advocate has filled them in.
        INSERT INTO public.lawyers (
          user_id, full_name, bar_number, firm, county, phone, email, practice_areas,
          bar_license_expires_at, license_status, verified, accepting_clients
        )
        SELECT app.user_id,
               btrim(app.details->>'full_name'),
               app.details->>'roll_number',
               app.details->>'firm',
               app.details->>'district',
               app.details->>'phone',
               p.email,
               coalesce(
                 ARRAY(SELECT btrim(a) FROM unnest(string_to_array(
                   coalesce(app.details->>'practice_areas', ''), ',')) AS a
                       WHERE btrim(a) <> ''),
                 ARRAY[]::TEXT[]),
               expiry,
               CASE WHEN expiry >= current_date THEN 'active' ELSE 'unknown' END::public.lawyer_license_status,
               true,
               false
        FROM (SELECT 1) AS one
        LEFT JOIN public.profiles p ON p.id = app.user_id;
      END IF;
    END IF;

    UPDATE public.profiles SET requested_role = NULL
      WHERE id = app.user_id AND requested_role = app.role;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, kind, link)
  VALUES (
    app.user_id,
    CASE _decision
      WHEN 'approve' THEN 'Your ' || label || ' account is approved'
      WHEN 'changes' THEN 'Your ' || label || ' application needs changes'
      ELSE 'Your ' || label || ' application was not approved'
    END,
    CASE _decision
      WHEN 'approve' THEN 'Your ' || label || ' workspace is ready.'
      ELSE note
    END,
    'application',
    '/apply'
  );

  RETURN app;
END;
$$;

REVOKE ALL ON FUNCTION public.review_role_application(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_role_application(UUID, TEXT, TEXT) TO authenticated;

-- ============ Professional roles only through an approved application ============
-- Applies to people (Clerk tokens carry role "authenticated"), admins included: the admin panels
-- grant these roles by approving an application. Server scripts (service role) and migrations
-- are exempt — they set up demo and seed accounts.

CREATE OR REPLACE FUNCTION public.require_approved_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('lawyer', 'police', 'judiciary')
     AND coalesce(auth.jwt()->>'role', '') = 'authenticated'
     AND NOT EXISTS (
       SELECT 1 FROM public.role_applications a
       WHERE a.user_id = NEW.user_id AND a.role = NEW.role AND a.status = 'approved'
     ) THEN
    RAISE EXCEPTION 'Advocate, police and judiciary access is granted by approving the person''s application (Admin → Applications).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_require_application ON public.user_roles;
CREATE TRIGGER trg_user_roles_require_application
  BEFORE INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.require_approved_application();

-- ============ Advocate listings: no self-made, self-verified listings ============
-- enforce_lawyer_admin_fields() only guarded UPDATE, so any signed-in account could INSERT its
-- own listing already marked verified and appear in the public directory. Only an advocate (or an
-- admin) may create one now, and only an admin's is created verified.

CREATE OR REPLACE FUNCTION public.enforce_lawyer_listing_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.jwt()->>'role', '') = 'authenticated'
     AND NOT public.has_role((auth.jwt()->>'sub'), 'admin') THEN
    IF NOT public.has_role((auth.jwt()->>'sub'), 'lawyer') THEN
      RAISE EXCEPTION 'Only an approved advocate can create an advocate listing.'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.verified := false;
    NEW.rating := 0;
    NEW.review_count := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lawyers_listing_insert ON public.lawyers;
CREATE TRIGGER trg_lawyers_listing_insert BEFORE INSERT ON public.lawyers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lawyer_listing_insert();
