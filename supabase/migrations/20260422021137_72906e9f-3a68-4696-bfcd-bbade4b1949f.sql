
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS risk_reward numeric,
  ADD COLUMN IF NOT EXISTS risk_percent numeric,
  ADD COLUMN IF NOT EXISTS lot_size numeric,
  ADD COLUMN IF NOT EXISTS strategy text,
  ADD COLUMN IF NOT EXISTS tags text[];
