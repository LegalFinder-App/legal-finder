-- Foundation schema for case-detail page, case deadlines, and advocate license/CPD compliance
-- tracking. Follows the has_role((auth.jwt()->>'sub'), role) / TEXT-sub-claim pattern established
-- in 20260908110000_clerk_auth_migration_retry.sql.

-- ============ Case outcomes ============
-- Needed so advocate "win rate" analytics (Phase 4) are real rather than approximated from
-- status/updated_at. Only meaningful once a case is closed.

CREATE TYPE public.case_outcome AS ENUM ('won', 'lost', 'settled', 'dismissed', 'withdrawn', 'other');

ALTER TABLE public.cases ADD COLUMN outcome public.case_outcome;
ALTER TABLE public.cases ADD CONSTRAINT cases_outcome_requires_closed
  CHECK (outcome IS NULL OR status = 'closed');
-- No RLS change needed: cases_participants_update already covers every column on the row.

-- ============ Case deadlines ============
-- cases.next_hearing is a single scalar, unsuited to tracking multiple filing/SOL deadlines per
-- case. This is a proper log, surfaced on the new case-detail page.

CREATE TYPE public.case_deadline_type AS ENUM ('filing', 'statute_of_limitations', 'hearing', 'other');
CREATE TYPE public.case_deadline_status AS ENUM ('upcoming', 'completed', 'missed');

CREATE TABLE public.case_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  deadline_type public.case_deadline_type NOT NULL DEFAULT 'other',
  due_date DATE NOT NULL,
  status public.case_deadline_status NOT NULL DEFAULT 'upcoming',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_deadlines TO authenticated;
GRANT ALL ON public.case_deadlines TO service_role;
ALTER TABLE public.case_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_deadlines_read" ON public.case_deadlines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = case_id
      AND (c.client_id = (auth.jwt()->>'sub') OR c.lawyer_id = (auth.jwt()->>'sub')
           OR public.has_role((auth.jwt()->>'sub'), 'admin'))
  ));
CREATE POLICY "case_deadlines_insert" ON public.case_deadlines FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (auth.jwt()->>'sub')
    AND EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = case_id
        AND (c.client_id = (auth.jwt()->>'sub') OR c.lawyer_id = (auth.jwt()->>'sub')
             OR public.has_role((auth.jwt()->>'sub'), 'admin'))
    )
  );
-- Status updates (e.g. marking a deadline completed) may come from either side of the case, not
-- just whoever created it — unlike delete, which is creator-or-admin only, to stop one party
-- casually removing a deadline the other side is tracking.
CREATE POLICY "case_deadlines_update" ON public.case_deadlines FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = case_id
      AND (c.client_id = (auth.jwt()->>'sub') OR c.lawyer_id = (auth.jwt()->>'sub')
           OR public.has_role((auth.jwt()->>'sub'), 'admin'))
  ));
CREATE POLICY "case_deadlines_delete" ON public.case_deadlines FOR DELETE TO authenticated
  USING (created_by = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE TRIGGER trg_case_deadlines_updated BEFORE UPDATE ON public.case_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_audit_case_deadlines AFTER INSERT OR UPDATE OR DELETE ON public.case_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

-- ============ Advocate license + CPD compliance ============

ALTER TABLE public.lawyers ADD COLUMN bar_license_expires_at DATE;

CREATE TYPE public.lawyer_license_status AS ENUM ('active', 'expiring', 'expired', 'unknown');
ALTER TABLE public.lawyers ADD COLUMN license_status public.lawyer_license_status NOT NULL DEFAULT 'unknown';
-- Advocate-self-editable (they self-report license info): the existing
-- enforce_lawyer_admin_fields() trigger only locks verified/rating/review_count, so these two new
-- columns fall through untouched — no trigger change needed.

CREATE TABLE public.lawyer_cpd_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES public.lawyers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0),
  completed_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lawyer_cpd_records TO authenticated;
GRANT ALL ON public.lawyer_cpd_records TO service_role;
ALTER TABLE public.lawyer_cpd_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cpd_self_manage" ON public.lawyer_cpd_records FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_id
      AND (l.user_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lawyers l WHERE l.id = lawyer_id
      AND (l.user_id = (auth.jwt()->>'sub') OR public.has_role((auth.jwt()->>'sub'), 'admin'))
  ));

CREATE TRIGGER trg_audit_lawyer_cpd_records AFTER INSERT OR UPDATE OR DELETE ON public.lawyer_cpd_records
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
