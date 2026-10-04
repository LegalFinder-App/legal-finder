-- Public reviews are screened for abusive language before they're posted (App Store guideline
-- 1.2 asks for "a method for filtering objectionable material"). Private messages are not
-- filtered: a client may need to quote their advocate exactly what was said to them. Messages
-- can be reported and their sender blocked instead (20261004120000_reports_and_blocks.sql).
--
-- A trigger rather than a policy, because the two Clerk auth migrations re-apply on every
-- db:migrate and recreate the reviews policies.

CREATE OR REPLACE FUNCTION public.has_abusive_language(content TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(content, '') ~* (
    '\m(' ||
    'f+u+c+k\w*|motherf\w*|sh[i1]t(s|ty|head\w*)?|bullshit|b[i1]tch\w*|c+u+n+t\w*|' ||
    'a(ss|rse)holes?|dickheads?|wank(er|ers|ing)?|twats?|wh[o0]res?|sluts?|puss(y|ies)|' ||
    'n[i1]gg(a|as|er|ers|ah)|fag(s|got|gots)?|retard(s|ed)?|kikes?|spics?|chinks?' ||
    ')\M'
  );
$$;

CREATE OR REPLACE FUNCTION public.screen_review_text()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.has_abusive_language(NEW.comment) OR public.has_abusive_language(NEW.author_name) THEN
    RAISE EXCEPTION 'Please remove offensive language from your review before posting it.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_screen_text ON public.reviews;
CREATE TRIGGER trg_reviews_screen_text
  BEFORE INSERT OR UPDATE OF comment, author_name ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.screen_review_text();
