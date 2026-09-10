-- Lawyer payout destinations + per-payment payout tracking, backing automated Flutterwave
-- transfers triggered right after a consultation payment is confirmed (see
-- src/lib/payouts.server.ts). Lawyers keep 100% of the consultation fee — no platform
-- commission — so this is a 1:1 payout per payment, not a batched ledger.

-- Kept as its own table rather than columns on `lawyers`: `lawyers` has a `USING (true)`
-- public-read policy (lawyers_public_read), and payout phone/bank numbers must never be
-- publicly readable.
CREATE TABLE public.lawyer_payout_accounts (
  lawyer_user_id TEXT PRIMARY KEY, -- Clerk sub, same convention as lawyers.user_id (TEXT, no FK — see 20260908110000_clerk_auth_migration_retry.sql)
  method TEXT NOT NULL CHECK (method IN ('mobile_money', 'bank')),
  mobile_network TEXT CHECK (mobile_network IN ('MTN', 'AIRTEL')),
  phone_number TEXT,
  bank_code TEXT,
  account_number TEXT,
  account_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lawyer_payout_accounts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.lawyer_payout_accounts TO authenticated;
GRANT ALL ON public.lawyer_payout_accounts TO service_role;

-- Owner-only read/write; admins can read for support but not write (a lawyer's own payout
-- destination should only ever be entered by the lawyer themselves).
CREATE POLICY "payout_account_owner_manage" ON public.lawyer_payout_accounts FOR ALL TO authenticated
  USING (lawyer_user_id = (auth.jwt()->>'sub'))
  WITH CHECK (lawyer_user_id = (auth.jwt()->>'sub'));
CREATE POLICY "payout_account_admin_read" ON public.lawyer_payout_accounts FOR SELECT TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE TRIGGER trg_payout_accounts_updated BEFORE UPDATE ON public.lawyer_payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-payment payout tracking. 'not_applicable' covers payments with no lawyer_id; new
-- lawyer-linked payments default to 'pending' via the trigger below rather than requiring every
-- INSERT call site (client-initiated, via payments_client_insert) to set it explicitly.
ALTER TABLE public.payments
  ADD COLUMN payout_status TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (payout_status IN ('not_applicable', 'pending', 'processing', 'completed', 'failed')),
  ADD COLUMN flutterwave_transfer_id TEXT,
  ADD COLUMN flutterwave_transfer_reference TEXT,
  ADD COLUMN payout_failure_reason TEXT,
  ADD COLUMN paid_out_at TIMESTAMPTZ;

CREATE INDEX idx_payments_payout_status ON public.payments (payout_status);
CREATE INDEX idx_payments_flutterwave_transfer_id ON public.payments (flutterwave_transfer_id);

CREATE OR REPLACE FUNCTION public.default_payout_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lawyer_id IS NOT NULL THEN
    NEW.payout_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payments_default_payout_status BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.default_payout_status();
