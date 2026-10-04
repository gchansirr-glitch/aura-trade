-- Revert: keep journal-charts public so embedded chart images keep working.
UPDATE storage.buckets SET public = true WHERE id = 'journal-charts';

DROP POLICY IF EXISTS "Owners read journal charts" ON storage.objects;
DROP POLICY IF EXISTS "Owners upload journal charts" ON storage.objects;
DROP POLICY IF EXISTS "Owners delete journal charts" ON storage.objects;

-- Public read for chart images (these are intentionally shared via public URL).
CREATE POLICY "Public read journal charts"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'journal-charts');

-- Only the owner may upload / delete their own chart files.
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