-- Server-enforced AI consent (assistant + drafting). UI still asks first; APIs 403 without this.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_consent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.ai_consent_at IS
  'When the account allowed text to be sent to the AI provider; NULL = withdrawn / never given.';
