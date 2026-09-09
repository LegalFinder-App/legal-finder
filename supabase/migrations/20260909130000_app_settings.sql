-- Single-row platform settings table backing the admin "Platform settings" panel: maintenance
-- mode and feature toggles read by the public site and workspace shell. One fixed row ('global')
-- rather than a key/value table — there is exactly one set of platform settings, not a list.
CREATE TABLE public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  incident_reporting_enabled BOOLEAN NOT NULL DEFAULT true,
  wanted_notices_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_assistant_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

INSERT INTO public.app_settings (id) VALUES ('global');

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Readable by everyone, including signed-out visitors — the public site (report an incident,
-- wanted notices) and the pre-auth shell both need to know these flags before sign-in.
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;

CREATE POLICY "app_settings_read" ON public.app_settings FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "app_settings_admin_update" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'))
  WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin'));
