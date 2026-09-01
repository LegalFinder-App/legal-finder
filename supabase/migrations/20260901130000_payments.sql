-- Consultation-fee payments via Pesapal. One row per checkout attempt, tied to the appointment
-- it pays for. Status transitions come from the Pesapal IPN/callback server routes running under
-- the service role (bypasses RLS), so client/lawyer policies below are read-mostly.

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lawyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  pesapal_order_tracking_id TEXT,
  pesapal_merchant_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_client ON public.payments(client_id);
CREATE INDEX idx_payments_lawyer ON public.payments(lawyer_id);
CREATE INDEX idx_payments_order_tracking ON public.payments(pesapal_order_tracking_id);

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_read" ON public.payments FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR lawyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "payments_client_insert" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Status transitions normally come from the Pesapal IPN/callback routes (service role, bypasses
-- this policy entirely). This just lets an admin correct a record by hand if needed.
CREATE POLICY "payments_admin_update" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment status changes show up in the existing admin audit trail for free.
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
