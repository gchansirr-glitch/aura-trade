CREATE TABLE public.telegram_links (
  telegram_id bigint PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  telegram_username text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.telegram_links TO authenticated;
GRANT ALL ON public.telegram_links TO service_role;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own telegram link" ON public.telegram_links FOR SELECT TO authenticated USING (auth.uid() = user_id);