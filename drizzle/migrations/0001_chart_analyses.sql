CREATE TABLE public.chart_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_path text,
  news_context text,
  analysis jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chart_analyses_user ON public.chart_analyses (user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.chart_analyses TO authenticated;
GRANT ALL ON public.chart_analyses TO service_role;
ALTER TABLE public.chart_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ca_select_own" ON public.chart_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ca_insert_own" ON public.chart_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ca_delete_own" ON public.chart_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);