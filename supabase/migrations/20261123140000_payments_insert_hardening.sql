-- Clients create consultation payments only through this RPC (fee + ownership checked).
-- Direct INSERT via payments_client_insert is closed.

CREATE OR REPLACE FUNCTION public.create_consultation_payment(p_appointment_id UUID)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT := (auth.jwt()->>'sub');
  v_appt public.appointments%ROWTYPE;
  v_fee NUMERIC(12, 2);
  v_payment public.payments%ROWTYPE;
BEGIN
  IF v_caller IS NULL OR length(trim(v_caller)) = 0 THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  IF v_appt.client_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Only the client who booked can start payment';
  END IF;

  SELECT consultation_fee INTO v_fee
  FROM public.lawyers
  WHERE user_id = v_appt.lawyer_id
  LIMIT 1;

  IF v_fee IS NULL OR v_fee <= 0 THEN
    RAISE EXCEPTION 'This advocate has no consultation fee configured';
  END IF;

  INSERT INTO public.payments (
    appointment_id,
    client_id,
    lawyer_id,
    amount,
    currency,
    status,
    description
  )
  VALUES (
    v_appt.id,
    v_caller,
    v_appt.lawyer_id,
    v_fee,
    'UGX',
    'pending',
    COALESCE('Consultation with ' || NULLIF(trim(v_appt.lawyer_name), ''), 'Consultation fee')
  )
  RETURNING * INTO v_payment;

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.create_consultation_payment(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_consultation_payment(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "payments_client_insert" ON public.payments;
-- Block direct inserts from the JWT role; RPC is SECURITY DEFINER.
CREATE POLICY "payments_client_insert" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (false);
