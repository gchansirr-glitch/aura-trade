
-- binance_orders: block direct client writes explicitly (backend-only via service role)
CREATE POLICY "No client inserts on binance_orders" ON public.binance_orders FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No client updates on binance_orders" ON public.binance_orders FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes on binance_orders" ON public.binance_orders FOR DELETE TO authenticated USING (false);

-- journal-charts private bucket: allow owners to read their own files
CREATE POLICY "Users can read own journal charts" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'journal-charts' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own journal charts" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'journal-charts' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own journal charts" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'journal-charts' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- payment-screenshots: allow owners to update/delete their own uploads
CREATE POLICY "Users can update own payment screenshots" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-screenshots' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own payment screenshots" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-screenshots' AND (auth.uid())::text = (storage.foldername(name))[1]);
