-- Fix public reads of news, advice and judgements.
-- Policies called has_role() for every row; after EXECUTE was revoked from anon,
-- anonymous SELECTs failed with "permission denied for function has_role".

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "news_read" ON public.news_posts;
DROP POLICY IF EXISTS "news_read_published" ON public.news_posts;
DROP POLICY IF EXISTS "news_read_admin" ON public.news_posts;
CREATE POLICY "news_read_published" ON public.news_posts
  FOR SELECT TO anon, authenticated
  USING (published = true);
CREATE POLICY "news_read_admin" ON public.news_posts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "advice_read" ON public.legal_advices;
DROP POLICY IF EXISTS "advice_read_published" ON public.legal_advices;
DROP POLICY IF EXISTS "advice_read_admin" ON public.legal_advices;
CREATE POLICY "advice_read_published" ON public.legal_advices
  FOR SELECT TO anon, authenticated
  USING (published = true OR author_id = auth.uid());
CREATE POLICY "advice_read_admin" ON public.legal_advices
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "judg_read" ON public.judgements;
DROP POLICY IF EXISTS "judg_read_published" ON public.judgements;
DROP POLICY IF EXISTS "judg_read_admin" ON public.judgements;
CREATE POLICY "judg_read_published" ON public.judgements
  FOR SELECT TO anon, authenticated
  USING (published = true OR uploaded_by = auth.uid());
CREATE POLICY "judg_read_admin" ON public.judgements
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
