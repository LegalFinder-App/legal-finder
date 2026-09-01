-- The admin dashboard needs to list every user's roles and assign/revoke them.
-- Until now, `user_roles` only had a self-scoped SELECT policy and no INSERT/UPDATE/DELETE
-- policy at all, so no one — not even admin — could manage roles through the app (only
-- service_role could, i.e. direct DB access). This closes that gap for the admin role only.

DROP POLICY IF EXISTS "roles_read_own" ON public.user_roles;
CREATE POLICY "roles_read_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_admin_update" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Role changes now flow through RLS instead of only ever being seeded/edited directly in the
-- database, so they show up in the existing audit trail (trg_audit_user_roles is already wired).
