-- Storage buckets for document vault and media uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', false, 52428800, NULL),
  ('media', 'media', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous incident reports (public safety surface).
GRANT INSERT ON public.incident_reports TO anon;

DROP POLICY IF EXISTS "incident_insert" ON public.incident_reports;

CREATE POLICY "incident_insert_auth" ON public.incident_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id IS NULL OR reporter_id = auth.uid());

CREATE POLICY "incident_insert_anon" ON public.incident_reports FOR INSERT TO anon
  WITH CHECK (reporter_id IS NULL AND anonymous = true);
