-- Advanced advocate KYC: persist KYC on the listing, require NIN + selfie (+ ID back),
-- DB-enforce the admin review checklist, block one-click verify, and support PC renewal
-- that drops verified until an admin re-approves. Vendor columns stay null until a
-- NIRA/liveness provider is wired (src/lib/kyc/provider.ts).

-- ============ 1. KYC columns on lawyers ============

ALTER TABLE public.lawyers
  ADD COLUMN IF NOT EXISTS practising_certificate_number TEXT,
  ADD COLUMN IF NOT EXISTS enrolment_certificate_ref TEXT,
  ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'none'
    CHECK (kyc_status IN ('none', 'pending', 'verified', 'expired', 'rejected')),
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_expires_at DATE,
  ADD COLUMN IF NOT EXISTS kyc_application_id UUID REFERENCES public.role_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kyc_vendor TEXT,
  ADD COLUMN IF NOT EXISTS kyc_vendor_ref TEXT;

COMMENT ON COLUMN public.lawyers.kyc_status IS
  'none | pending | verified | expired | rejected — Directory Verified means verified with a current PC.';
COMMENT ON COLUMN public.lawyers.kyc_vendor IS
  'Optional identity vendor name (null while in-house review is the only path).';

-- Seeded demo listings stay illustrative verified content; leave kyc_status as-is for rows
-- that already show verified so the directory does not blink until an owner cleans them up.
UPDATE public.lawyers
  SET kyc_status = 'verified',
      kyc_verified_at = coalesce(kyc_verified_at, now()),
      kyc_expires_at = coalesce(kyc_expires_at, bar_license_expires_at)
  WHERE verified = true AND kyc_status = 'none';

-- ============ 2. Requirements (NIN + selfie + ID back) ============

DROP FUNCTION IF EXISTS public.role_application_requirements(public.app_role);

CREATE OR REPLACE FUNCTION public.role_application_requirements(
  _role public.app_role,
  _purpose TEXT DEFAULT NULL
)
RETURNS TABLE (fields TEXT[], documents TEXT[])
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN _role = 'lawyer' AND coalesce(_purpose, '') = 'renewal' THEN
        ARRAY['practising_certificate_number', 'practising_certificate_expiry', 'national_id_number']
      WHEN _role = 'lawyer' THEN
        ARRAY['full_name', 'roll_number', 'practising_certificate_number',
              'practising_certificate_expiry', 'firm', 'district', 'phone', 'national_id_number']
      WHEN _role = 'police' THEN
        ARRAY['full_name', 'force_number', 'rank', 'station', 'district', 'phone']
      WHEN _role = 'judiciary' THEN
        ARRAY['full_name', 'position', 'court', 'staff_number', 'phone']
      ELSE ARRAY[]::TEXT[]
    END,
    CASE
      WHEN _role = 'lawyer' AND coalesce(_purpose, '') = 'renewal' THEN
        ARRAY['practising_certificate', 'selfie']
      WHEN _role = 'lawyer' THEN
        ARRAY['practising_certificate', 'enrolment_certificate', 'national_id',
              'national_id_back', 'selfie']
      WHEN _role = 'police' THEN
        ARRAY['police_id', 'authorisation_letter', 'national_id']
      WHEN _role = 'judiciary' THEN
        ARRAY['staff_id', 'appointment_letter', 'national_id']
      ELSE ARRAY[]::TEXT[]
    END;
$$;

-- ============ 3. Verified only via KYC RPC / service_role ============

CREATE OR REPLACE FUNCTION public.enforce_lawyer_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kyc_ok BOOLEAN := current_setting('app.kyc_verify_ok', true) = 'on';
  is_service BOOLEAN := coalesce(auth.jwt()->>'role', '') = 'service_role';
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    IF NEW.verified = true AND NOT kyc_ok AND NOT is_service THEN
      RAISE EXCEPTION
        'Verified status is set only through an approved application or practising-certificate renewal.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.verified = false AND NOT kyc_ok AND NOT is_service
       AND pg_trigger_depth() <= 1 THEN
      RAISE EXCEPTION
        'Revoke verification by rejecting KYC or waiting for certificate expiry — not from this screen.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF pg_trigger_depth() <= 1 AND NOT public.has_role((auth.jwt()->>'sub'), 'admin')
     AND NOT is_service AND NOT kyc_ok THEN
    IF NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.review_count IS DISTINCT FROM OLD.review_count THEN
      RAISE EXCEPTION 'Only an administrator can change rating or review count.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_lawyer_listing_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kyc_ok BOOLEAN := current_setting('app.kyc_verify_ok', true) = 'on';
  is_service BOOLEAN := coalesce(auth.jwt()->>'role', '') = 'service_role';
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
  ELSIF NEW.verified = true AND NOT kyc_ok AND NOT is_service THEN
    RAISE EXCEPTION
      'Verified listings are created only through an approved advocate application.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- ============ 4. Submit (renewal-aware) ============

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
  purpose TEXT;
BEGIN
  SELECT * INTO app FROM public.role_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND OR app.user_id IS DISTINCT FROM (auth.jwt()->>'sub') THEN
    RAISE EXCEPTION 'Application not found.';
  END IF;
  IF app.status NOT IN ('draft', 'changes_requested') THEN
    RAISE EXCEPTION 'This application has already been sent.';
  END IF;

  purpose := nullif(btrim(coalesce(app.details->>'purpose', '')), '');
  SELECT * INTO req FROM public.role_application_requirements(app.role, purpose);
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
    SET status = 'submitted',
        submitted_at = now(),
        review_checks = '{}'::jsonb,
        review_note = NULL,
        reviewed_by = NULL,
        reviewed_at = NULL
    WHERE id = app.id
    RETURNING * INTO app;

  IF app.role = 'lawyer' THEN
    UPDATE public.lawyers
      SET kyc_status = 'pending'
      WHERE user_id = app.user_id AND kyc_status IN ('none', 'expired', 'rejected', 'verified');
  END IF;

  INSERT INTO public.notifications (user_id, title, body, kind, link)
  SELECT DISTINCT ur.user_id,
         CASE WHEN purpose = 'renewal'
              THEN 'Advocate practising-certificate renewal'
              ELSE 'New ' || public.role_label(app.role) || ' application' END,
         coalesce(nullif(btrim(app.details->>'full_name'), ''), 'Someone')
           || CASE WHEN purpose = 'renewal'
                   THEN ' sent a practising-certificate renewal.'
                   ELSE ' applied for a ' || public.role_label(app.role) || ' account.' END,
         'application',
         '/admin/applications'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN app;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_role_application(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_role_application(UUID) TO authenticated;

-- ============ 5. Review with checklist gate + KYC fields ============

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
  purpose TEXT;
  required_checks TEXT[];
  check_key TEXT;
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

  purpose := nullif(btrim(coalesce(app.details->>'purpose', '')), '');

  IF _decision = 'approve' AND app.role = 'lawyer' THEN
    required_checks := CASE
      WHEN purpose = 'renewal' THEN
        ARRAY['identity', 'certificate', 'documents_genuine', 'selfie']
      ELSE
        ARRAY['identity', 'certificate', 'enrolment', 'documents_genuine', 'selfie']
    END;
    FOREACH check_key IN ARRAY required_checks LOOP
      IF coalesce((app.review_checks ->> check_key)::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION
          'Tick every required identity check before approving (missing: %).', check_key
          USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;

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
    IF purpose IS DISTINCT FROM 'renewal' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (app.user_id, app.role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    IF app.role = 'lawyer' THEN
      PERFORM set_config('app.kyc_verify_ok', 'on', true);
      IF EXISTS (SELECT 1 FROM public.lawyers WHERE user_id = app.user_id) THEN
        UPDATE public.lawyers
          SET verified = true,
              bar_number = coalesce(nullif(btrim(app.details->>'roll_number'), ''), bar_number),
              practising_certificate_number = app.details->>'practising_certificate_number',
              enrolment_certificate_ref = coalesce(
                nullif(btrim(app.details->>'roll_number'), ''), enrolment_certificate_ref),
              bar_license_expires_at = expiry,
              license_status = 'active',
              kyc_status = 'verified',
              kyc_verified_at = now(),
              kyc_expires_at = expiry,
              kyc_application_id = app.id,
              accepting_clients = CASE
                WHEN purpose = 'renewal' THEN accepting_clients
                ELSE accepting_clients
              END,
              full_name = coalesce(nullif(btrim(app.details->>'full_name'), ''), full_name),
              firm = coalesce(nullif(btrim(app.details->>'firm'), ''), firm),
              county = coalesce(nullif(btrim(app.details->>'district'), ''), county),
              phone = coalesce(nullif(btrim(app.details->>'phone'), ''), phone)
          WHERE user_id = app.user_id;
      ELSE
        INSERT INTO public.lawyers (
          user_id, full_name, bar_number, practising_certificate_number,
          enrolment_certificate_ref, firm, county, phone, email, practice_areas,
          bar_license_expires_at, license_status, verified, accepting_clients,
          kyc_status, kyc_verified_at, kyc_expires_at, kyc_application_id
        )
        SELECT app.user_id,
               btrim(app.details->>'full_name'),
               app.details->>'roll_number',
               app.details->>'practising_certificate_number',
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
               false,
               'verified',
               now(),
               expiry,
               app.id
        FROM (SELECT 1) AS one
        LEFT JOIN public.profiles p ON p.id = app.user_id;
      END IF;
    END IF;

    UPDATE public.profiles SET requested_role = NULL
      WHERE id = app.user_id AND requested_role = app.role;
  ELSIF _decision = 'reject' AND app.role = 'lawyer' THEN
    PERFORM set_config('app.kyc_verify_ok', 'on', true);
    UPDATE public.lawyers
      SET kyc_status = 'rejected',
          verified = CASE WHEN purpose = 'renewal' THEN false ELSE verified END,
          accepting_clients = CASE WHEN purpose = 'renewal' THEN false ELSE accepting_clients END
      WHERE user_id = app.user_id;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, kind, link)
  VALUES (
    app.user_id,
    CASE
      WHEN _decision = 'approve' AND purpose = 'renewal' THEN
        'Practising certificate renewal approved'
      WHEN _decision = 'approve' THEN
        'Your ' || label || ' account is approved'
      WHEN _decision = 'changes' THEN
        'Your ' || label || ' application needs changes'
      ELSE
        'Your ' || label || ' application was not approved'
    END,
    CASE
      WHEN _decision = 'approve' AND purpose = 'renewal' THEN
        'Your verified listing is active again with the new practising certificate.'
      WHEN _decision = 'approve' THEN
        'Your ' || label || ' workspace is ready.'
      ELSE note
    END,
    'application',
    CASE WHEN purpose = 'renewal' THEN '/practice' ELSE '/apply' END
  );

  RETURN app;
END;
$$;

REVOKE ALL ON FUNCTION public.review_role_application(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_role_application(UUID, TEXT, TEXT) TO authenticated;

-- ============ 6. Start / open a PC renewal on the existing application row ============

CREATE OR REPLACE FUNCTION public.start_advocate_kyc_renewal()
RETURNS public.role_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller TEXT := auth.jwt()->>'sub';
  listing public.lawyers;
  app public.role_applications;
  details JSONB;
BEGIN
  IF NOT public.has_role(caller, 'lawyer') THEN
    RAISE EXCEPTION 'Only an advocate can renew a practising certificate.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO listing FROM public.lawyers WHERE user_id = caller;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No advocate listing found for your account.';
  END IF;

  -- Renew when expired/unverified, or within 30 days of PC expiry.
  IF listing.verified
     AND listing.kyc_status = 'verified'
     AND listing.bar_license_expires_at IS NOT NULL
     AND listing.bar_license_expires_at > (current_date + 30) THEN
    RAISE EXCEPTION
      'Your practising certificate is still current. You can renew within 30 days of expiry.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO app FROM public.role_applications
    WHERE user_id = caller AND role = 'lawyer' FOR UPDATE;

  details := jsonb_build_object(
    'purpose', 'renewal',
    'full_name', coalesce(listing.full_name, ''),
    'roll_number', coalesce(listing.bar_number, ''),
    'firm', coalesce(listing.firm, ''),
    'district', coalesce(listing.county, ''),
    'phone', coalesce(listing.phone, ''),
    'national_id_number', CASE
      WHEN FOUND THEN coalesce(app.details->>'national_id_number', '')
      ELSE ''
    END,
    'practising_certificate_number', '',
    'practising_certificate_expiry', ''
  );

  IF NOT FOUND THEN
    INSERT INTO public.role_applications (user_id, role, status, details)
    VALUES (caller, 'lawyer', 'draft', details)
    RETURNING * INTO app;
  ELSE
    IF app.status = 'submitted' THEN
      RAISE EXCEPTION 'A renewal is already waiting for review.';
    END IF;
    UPDATE public.role_applications
      SET status = 'draft',
          details = details,
          review_note = NULL,
          reviewed_by = NULL,
          reviewed_at = NULL,
          review_checks = '{}'::jsonb,
          submitted_at = NULL
      WHERE id = app.id
      RETURNING * INTO app;
  END IF;

  UPDATE public.lawyers SET kyc_status = 'pending' WHERE id = listing.id;

  RETURN app;
END;
$$;

REVOKE ALL ON FUNCTION public.start_advocate_kyc_renewal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_advocate_kyc_renewal() TO authenticated;

-- ============ 7. Batch expire verified listings whose PC has lapsed ============
-- Called by the compliance cron with the service role (or any caller that may run it
-- as SECURITY DEFINER — restricted to service_role / admin).

CREATE OR REPLACE FUNCTION public.expire_advocate_kyc()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER := 0;
  row RECORD;
  caller_role TEXT := coalesce(auth.jwt()->>'role', '');
  caller TEXT := auth.jwt()->>'sub';
BEGIN
  IF caller_role <> 'service_role' AND NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Only the compliance job or an administrator can expire KYC.';
  END IF;

  PERFORM set_config('app.kyc_verify_ok', 'on', true);

  FOR row IN
    SELECT id, user_id FROM public.lawyers
    WHERE verified = true
      AND bar_license_expires_at IS NOT NULL
      AND bar_license_expires_at < current_date
  LOOP
    UPDATE public.lawyers
      SET verified = false,
          kyc_status = 'expired',
          license_status = 'expired',
          accepting_clients = false
      WHERE id = row.id;
    IF row.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, kind, link)
      VALUES (
        row.user_id,
        'Practising certificate expired',
        'Your verified listing is paused until you renew your practising certificate and an administrator re-checks it.',
        'compliance',
        '/practice'
      );
    END IF;
    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_advocate_kyc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_advocate_kyc() TO authenticated, service_role;
