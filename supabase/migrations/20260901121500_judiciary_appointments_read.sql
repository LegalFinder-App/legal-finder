-- The bench (judiciary) workspace needs a hearing calendar and the live-courtroom panel, both
-- backed by `appointments`. RLS currently only grants read access to the client, the lawyer, or
-- admin — judges have no path to see scheduled hearings at all, which would make those bench
-- features permanently empty. Extend read access to the judiciary role (read-only; write policies
-- are unchanged, so judges still cannot create/update/delete appointments).

DROP POLICY IF EXISTS "appts_read" ON public.appointments;
CREATE POLICY "appts_read" ON public.appointments FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR lawyer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'judiciary')
  );
