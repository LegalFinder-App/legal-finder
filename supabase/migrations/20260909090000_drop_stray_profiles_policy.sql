-- 20260908120000_rbac_hardening.sql replaced profiles_public_read (anon, USING (true)) with a
-- properly scoped profiles_self_read. Post-apply verification found a SECOND permissive policy,
-- "profiles_authenticated_read" (USING (true), role authenticated), live on the database but
-- absent from every migration file in this repo — it was added out-of-band, directly against the
-- database, at some earlier point outside version control. Its effect: any signed-in user (not
-- just admins/case-linked advocates) could still read every other user's email/phone/
-- requested_role — the same PII exposure as the original bug, just gated by "logged in" instead
-- of "anyone at all". Dropping it; profiles_self_read already covers every legitimate read case.

DROP POLICY IF EXISTS "profiles_authenticated_read" ON public.profiles;
