-- Shared rate-limit counter for serverless instances (src/lib/rate-limit.server.ts).
-- Also tightens expire_advocate_kyc so only the service role can run the expiry job.

CREATE TABLE IF NOT EXISTS public.rate_limit_windows (
  key TEXT PRIMARY KEY,
  hits INT NOT NULL DEFAULT 0,
  window_starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_seconds INT NOT NULL
);

ALTER TABLE public.rate_limit_windows ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon — only service_role via SECURITY DEFINER RPC.

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS TABLE (allowed BOOLEAN, retry_after_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_hits INT;
  v_starts TIMESTAMPTZ;
  v_window INT;
  v_retry INT;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RAISE EXCEPTION 'rate limit key required';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'rate limit must be >= 1';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'window seconds must be >= 1';
  END IF;

  INSERT INTO public.rate_limit_windows (key, hits, window_starts_at, window_seconds)
  VALUES (p_key, 0, v_now, p_window_seconds)
  ON CONFLICT (key) DO NOTHING;

  SELECT hits, window_starts_at, window_seconds
  INTO v_hits, v_starts, v_window
  FROM public.rate_limit_windows
  WHERE key = p_key
  FOR UPDATE;

  IF v_starts + make_interval(secs => v_window) <= v_now THEN
    v_hits := 0;
    v_starts := v_now;
    v_window := p_window_seconds;
  END IF;

  v_hits := v_hits + 1;

  UPDATE public.rate_limit_windows
  SET hits = v_hits,
      window_starts_at = v_starts,
      window_seconds = v_window
  WHERE key = p_key;

  v_retry := GREATEST(
    1,
    CEIL(EXTRACT(EPOCH FROM (v_starts + make_interval(secs => v_window) - v_now)))::INT
  );

  RETURN QUERY SELECT (v_hits <= p_limit), v_retry;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INT, INT) TO service_role;

GRANT ALL ON TABLE public.rate_limit_windows TO service_role;

-- KYC expiry is a cron/ops job — not a browser-callable RPC.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'expire_advocate_kyc'
  ) THEN
    REVOKE ALL ON FUNCTION public.expire_advocate_kyc() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.expire_advocate_kyc() TO service_role;
  END IF;
END $$;
