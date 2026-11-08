-- Professional onboarding, hardened (follow-up to 20261005090000_professional_onboarding.sql).
--
--  1. An advocate can't be approved once their practising certificate has expired (it could
--     lapse while the application waited), nor with a Roll number another verified listing
--     already carries.
--  2. A practising certificate runs to 1 March of the following year at the latest (Judiciary:
--     "Advocates Certificates are renewed on an annual basis and expire on the 1st of March of
--     the next year"), so an expiry beyond that is refused at submission.
--  3. Reviewers record what they checked (review_checks) before deciding; kept with the
--     application as the record of the verification.
--  4. Document rows: the path must start with the applicant's own folder (LIKE treated "_" in
--     Clerk ids as a wildcard), the declared type and size must be ones the bucket accepts, and
--     an application holds at most 15 files.
--
-- The required fields and documents are unchanged (still mirrored in src/lib/onboarding.ts and
-- apps/mobile/src/lib/onboarding.ts).

-- ============ 4. Documents ============

DROP POLICY IF EXISTS "application_documents_insert" ON public.role_application_documents;
CREATE POLICY "application_documents_insert" ON public.role_application_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (auth.jwt()->>'sub')
    AND public.can_edit_role_application(application_id)
    AND starts_with(storage_path, (auth.jwt()->>'sub') || '/' || application_id::text || '/')
  );

ALTER TABLE public.role_application_documents
  DROP CONSTRAINT IF EXISTS role_application_documents_mime_check;
ALTER TABLE public.role_application_documents
  ADD CONSTRAINT role_application_documents_mime_check
  CHECK (mime_type IS NULL OR mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp'))
  NOT VALID;

ALTER TABLE public.role_application_documents
  DROP CONSTRAINT IF EXISTS role_application_documents_size_check;
ALTER TABLE public.role_application_documents
  ADD CONSTRAINT role_application_documents_size_check
  CHECK (size_bytes IS NULL OR size_bytes BETWEEN 1 AND 10485760)
  NOT VALID;

CREATE OR REPLACE FUNCTION public.limit_application_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.role_application_documents
      WHERE application_id = NEW.application_id) >= 15 THEN
    RAISE EXCEPTION 'An application can hold at most 15 files. Remove one first.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_documents_limit ON public.role_application_documents;
CREATE TRIGGER trg_application_documents_limit
  BEFORE INSERT ON public.role_application_documents
  FOR EACH ROW EXECUTE FUNCTION public.limit_application_documents();

-- ============ 3. Reviewer checklist ============

ALTER TABLE public.role_applications
  ADD COLUMN IF NOT EXISTS review_checks JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.role_applications
  DROP CONSTRAINT IF EXISTS role_applications_review_checks_check;
ALTER TABLE public.role_applications
  ADD CONSTRAINT role_applications_review_checks_check
  CHECK (jsonb_typeof(review_checks) = 'object' AND length(review_checks::text) <= 4000);

-- Admin only, while the application waits for review. Keeps only known-shaped keys with
-- true/false values, stamped with who checked and when.
CREATE OR REPLACE FUNCTION public.record_application_checks(_application_id UUID, _checks JSONB)
RETURNS public.role_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller TEXT := auth.jwt()->>'sub';
  app public.role_applications;
  clean JSONB;
BEGIN
  IF NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Only an administrator can record verification checks.';
  END IF;
  IF jsonb_typeof(_checks) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Checks must be an object.';
  END IF;
  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb) INTO clean
  FROM jsonb_each(_checks)
  WHERE key ~ '^[a-z_]{2,40}$' AND jsonb_typeof(value) = 'boolean';

  UPDATE public.role_applications
    SET review_checks = clean || jsonb_build_object('_by', caller, '_at', now())
    WHERE id = _application_id AND status = 'submitted'
    RETURNING * INTO app;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This application isn''t waiting for review.';
  END IF;
  RETURN app;
END;
$$;

REVOKE ALL ON FUNCTION public.record_application_checks(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_application_checks(UUID, JSONB) TO authenticated;

-- ============ 2. Submit: plausible certificate expiry ============

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
    IF expiry::date > make_date(extract(year FROM current_date)::int + 1, 3, 1) THEN
      RAISE EXCEPTION 'Practising certificates expire on 1 March of the following year at the latest. Check the expiry date.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  UPDATE public.role_applications
    SET status = 'submitted', submitted_at = now(), review_checks = '{}'::jsonb
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

-- ============ 1. Review: no expired certificates, no reused Roll numbers ============

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
  roll TEXT;
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
  IF _decision = 'approve' AND app.user_id = caller THEN
    RAISE EXCEPTION 'Another administrator has to approve your own application.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF _decision = 'approve' AND app.role = 'lawyer' THEN
    expiry := CASE WHEN app.details->>'practising_certificate_expiry' ~ '^\d{4}-\d{2}-\d{2}$'
                   THEN (app.details->>'practising_certificate_expiry')::date END;
    IF expiry IS NULL OR expiry < current_date THEN
      RAISE EXCEPTION 'The practising certificate has expired since this was sent. Ask the applicant for the current one.'
        USING ERRCODE = 'check_violation';
    END IF;
    roll := nullif(lower(regexp_replace(coalesce(app.details->>'roll_number', ''), '\s', '', 'g')), '');
    IF roll IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lawyers l
      WHERE l.verified
        AND l.user_id IS DISTINCT FROM app.user_id
        AND lower(regexp_replace(coalesce(l.bar_number, ''), '\s', '', 'g')) = roll
    ) THEN
      RAISE EXCEPTION 'Another verified advocate already holds Roll number %. Check it with the Chief Registrar before approving.',
        app.details->>'roll_number'
        USING ERRCODE = 'check_violation';
    END IF;
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
      IF EXISTS (SELECT 1 FROM public.lawyers WHERE user_id = app.user_id) THEN
        UPDATE public.lawyers
          SET verified = true,
              bar_number = app.details->>'roll_number',
              bar_license_expires_at = expiry,
              license_status = 'active'
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
               'active'::public.lawyer_license_status,
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
