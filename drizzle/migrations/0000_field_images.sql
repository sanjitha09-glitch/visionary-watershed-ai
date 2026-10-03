CREATE TABLE public.field_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  sha256 text NOT NULL,
  lat double precision,
  lng double precision,
  location_source text NOT NULL DEFAULT 'unavailable' CHECK (location_source IN ('exif','manual','unavailable')),
  captured_at timestamptz,
  device text,
  watershed_id text REFERENCES public.watersheds(id),
  intervention_id text REFERENCES public.interventions(id),
  observation text,
  sync_status text NOT NULL DEFAULT 'synced',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX field_images_ws_idx ON public.field_images(watershed_id);
CREATE INDEX field_images_iv_idx ON public.field_images(intervention_id);
CREATE INDEX field_images_ll_idx ON public.field_images(lat, lng);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_images TO authenticated;
GRANT ALL ON public.field_images TO service_role;
ALTER TABLE public.field_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read field images" ON public.field_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "Uploaders insert own images" ON public.field_images FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Uploaders or admins update" ON public.field_images FOR UPDATE TO authenticated USING (uploaded_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Uploaders or admins delete" ON public.field_images FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Signed-in read field image files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'field-images');
CREATE POLICY "Users upload to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'field-images' AND (storage.foldername(name))[1] = auth.uid()::text);