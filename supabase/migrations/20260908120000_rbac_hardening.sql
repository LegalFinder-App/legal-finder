-- RBAC hardening: close two live RLS gaps found in an auth/RBAC audit, plus one defense-in-depth
-- addition. See supabase/migrations/20260908110000_clerk_auth_migration_retry.sql for the
-- has_role((auth.jwt()->>'sub'), role) / TEXT-sub-claim pattern this migration continues.

-- ============ A. profiles was world-readable (anon, USING (true)) ============
-- Leaked email/phone/requested_role to anyone holding the public anon key. Replace with: self,
-- admin, or an advocate reading a client they share a case with (practice-workspace.tsx's
-- ClientList needs that last clause — it reads profiles for every client on the advocate's cases
-- through the ordinary authenticated browser client).

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;

CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (auth.jwt()->>'sub')
    OR public.has_role((auth.jwt()->>'sub'), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.client_id = profiles.id
        AND c.lawyer_id = (auth.jwt()->>'sub')
    )
  );

-- ============ B. Advocates could self-verify via the blanket lawyers_self_manage policy ============
-- verified/rating/review_count are meant to be admin- or system-set only (rating/review_count via
-- refresh_lawyer_rating(), a trigger on reviews). Column-level GRANT/REVOKE can't express this,
-- since advocate and admin share the same Postgres "authenticated" role — app-level admin is a
-- user_roles row, not a Postgres role. Use a BEFORE UPDATE trigger instead, gated on
-- pg_trigger_depth() so refresh_lawyer_rating()'s own nested UPDATE (fired from the reviews
-- trigger, so depth > 1 by the time this fires) still goes through untouched — only a direct,
-- top-level UPDATE from a client is checked.

CREATE OR REPLACE FUNCTION public.enforce_lawyer_admin_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() <= 1 AND NOT public.has_role((auth.jwt()->>'sub'), 'admin') THEN
    IF NEW.verified IS DISTINCT FROM OLD.verified
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.review_count IS DISTINCT FROM OLD.review_count THEN
      RAISE EXCEPTION 'Only an administrator can change verification status, rating, or review count.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lawyers_admin_fields ON public.lawyers;
CREATE TRIGGER trg_lawyers_admin_fields BEFORE UPDATE ON public.lawyers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lawyer_admin_fields();

-- Also stop exposing unverified advocates' real name/phone/email/bar number to anonymous
-- visitors before they've been vetted. Self/admin access to a not-yet-verified row is unaffected
-- — that's covered separately by lawyers_self_manage.
DROP POLICY IF EXISTS "lawyers_public_read" ON public.lawyers;
CREATE POLICY "lawyers_public_read" ON public.lawyers FOR SELECT TO anon, authenticated
  USING (verified = true);

-- ============ D. Defense-in-depth: don't allow removing the last remaining admin ============
-- UI already disables this (users-panel.tsx preventSelfDemotion), but nothing stopped a direct
-- API call from deleting the last admin's role row and locking the platform.

CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role = 'admin' AND (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last remaining admin.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_removal ON public.user_roles;
CREATE TRIGGER trg_prevent_last_admin_removal BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();
