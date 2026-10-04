
-- Add outcome enum
DO $$ BEGIN
  CREATE TYPE public.trade_outcome AS ENUM ('WIN', 'LOSS', 'BREAKEVEN', 'OPEN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Extend journal_entries
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS entry_price numeric,
  ADD COLUMN IF NOT EXISTS stop_loss numeric,
  ADD COLUMN IF NOT EXISTS take_profit numeric,
  ADD COLUMN IF NOT EXISTS outcome public.trade_outcome NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS ai_review text;

-- Storage bucket for journal chart images (public for simple display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-charts', 'journal-charts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users manage their own folder (folder = auth.uid())
DO $$ BEGIN
  CREATE POLICY "Journal charts are publicly viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'journal-charts');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users upload own journal charts"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'journal-charts' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own journal charts"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'journal-charts' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users delete own journal charts"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'journal-charts' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN null; END $$;
