-- Lock down SECURITY DEFINER functions: only the database / triggers / RLS engine should execute them.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_premium_users() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.score_journal_entry() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Restrict public listing on journal-charts bucket. Files remain accessible via public URL
-- but anonymous clients can no longer enumerate the bucket contents.
DROP POLICY IF EXISTS "Public read journal charts" ON storage.objects;
DROP POLICY IF EXISTS "journal-charts public read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view journal charts" ON storage.objects;

CREATE POLICY "Owners read journal charts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-charts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners upload journal charts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'journal-charts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners delete journal charts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal-charts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Make the bucket private so file enumeration is no longer possible.
UPDATE storage.buckets SET public = false WHERE id = 'journal-charts';