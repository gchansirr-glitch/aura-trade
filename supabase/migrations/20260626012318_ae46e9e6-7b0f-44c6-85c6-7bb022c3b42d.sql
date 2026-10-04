-- Replace remaining has_role() usages so authenticated clients don't need EXECUTE on the function.

DROP POLICY IF EXISTS "Users view own binance orders" ON public.binance_orders;
CREATE POLICY "Users view own binance orders"
ON public.binance_orders
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

DROP POLICY IF EXISTS "Users view own payment screenshots" ON storage.objects;
CREATE POLICY "Users view own payment screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::public.app_role
    )
  )
);

-- Drop legacy public-read policies on journal-charts now that the bucket is private.
DROP POLICY IF EXISTS "Journal charts are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Public read journal charts" ON storage.objects;