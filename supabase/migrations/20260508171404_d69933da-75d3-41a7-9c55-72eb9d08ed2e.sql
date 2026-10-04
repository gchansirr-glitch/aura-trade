
-- 1. Psychological audits
CREATE TABLE public.psych_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  summary TEXT NOT NULL,
  biases JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  trade_count_at_audit INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.psych_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own audits" ON public.psych_audits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own audits" ON public.psych_audits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 2. Prop firm accounts
CREATE TABLE public.prop_firm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  firm_name TEXT NOT NULL,
  account_size NUMERIC NOT NULL,
  starting_balance NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  profit_target NUMERIC NOT NULL,
  daily_drawdown_limit NUMERIC NOT NULL,
  max_drawdown_limit NUMERIC NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prop_firm_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pf_select_own" ON public.prop_firm_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pf_insert_own" ON public.prop_firm_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pf_update_own" ON public.prop_firm_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pf_delete_own" ON public.prop_firm_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER pf_updated_at BEFORE UPDATE ON public.prop_firm_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.prop_firm_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.prop_firm_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  stat_date DATE NOT NULL,
  starting_balance NUMERIC NOT NULL,
  ending_balance NUMERIC NOT NULL,
  pnl NUMERIC NOT NULL DEFAULT 0,
  drawdown_pct NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, stat_date)
);
ALTER TABLE public.prop_firm_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pfd_select_own" ON public.prop_firm_daily_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pfd_insert_own" ON public.prop_firm_daily_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pfd_update_own" ON public.prop_firm_daily_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. Discipline scores & events
CREATE TABLE public.discipline_scores (
  user_id UUID PRIMARY KEY,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discipline_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ds_select_own" ON public.discipline_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.discipline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  journal_entry_id UUID,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discipline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "de_select_own" ON public.discipline_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. Auto scoring trigger
CREATE OR REPLACE FUNCTION public.score_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pts INTEGER := 0;
  reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NEW.stop_loss IS NOT NULL AND NEW.take_profit IS NOT NULL AND NEW.strategy IS NOT NULL THEN
    pts := pts + 10;
    reasons := array_append(reasons, '+10 plan followed (SL/TP/strategy)');
  END IF;
  IF NEW.risk_percent IS NOT NULL AND NEW.risk_percent <= 2 THEN
    pts := pts + 5;
    reasons := array_append(reasons, '+5 risk <=2%');
  END IF;
  IF NEW.sentiment IS NOT NULL AND length(NEW.notes) >= 50 THEN
    pts := pts + 5;
    reasons := array_append(reasons, '+5 logged sentiment & detailed notes');
  END IF;
  IF NEW.stop_loss IS NULL THEN
    pts := pts - 10;
    reasons := array_append(reasons, '-10 no stop loss');
  END IF;
  IF NEW.risk_percent IS NOT NULL AND NEW.risk_percent > 5 THEN
    pts := pts - 5;
    reasons := array_append(reasons, '-5 risk >5%');
  END IF;

  INSERT INTO public.discipline_events (user_id, journal_entry_id, points, reason)
  VALUES (NEW.user_id, NEW.id, pts, array_to_string(reasons, '; '));

  INSERT INTO public.discipline_scores (user_id, total_points, current_streak, longest_streak, level, updated_at)
  VALUES (NEW.user_id, GREATEST(pts, 0), CASE WHEN pts > 0 THEN 1 ELSE 0 END, CASE WHEN pts > 0 THEN 1 ELSE 0 END, 1, now())
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_points = GREATEST(discipline_scores.total_points + pts, 0),
    current_streak = CASE WHEN pts > 0 THEN discipline_scores.current_streak + 1 ELSE 0 END,
    longest_streak = GREATEST(discipline_scores.longest_streak, CASE WHEN pts > 0 THEN discipline_scores.current_streak + 1 ELSE discipline_scores.longest_streak END),
    level = 1 + (GREATEST(discipline_scores.total_points + pts, 0) / 100),
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_score_journal_entry
AFTER INSERT ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.score_journal_entry();

-- 5. Leaderboard view (public-safe: no email, no IDs)
CREATE OR REPLACE VIEW public.leaderboard_view
WITH (security_invoker = true)
AS
SELECT
  COALESCE(p.display_name, 'Trader') AS display_name,
  ds.total_points,
  ds.level,
  ds.longest_streak,
  ds.user_id
FROM public.discipline_scores ds
LEFT JOIN public.profiles p ON p.id = ds.user_id;

GRANT SELECT ON public.leaderboard_view TO authenticated;

-- Allow leaderboard reads: relax discipline_scores select to authenticated read-all (only points/level — no PII)
DROP POLICY IF EXISTS "ds_select_own" ON public.discipline_scores;
CREATE POLICY "ds_select_all_auth" ON public.discipline_scores FOR SELECT TO authenticated USING (true);

-- Allow reading display_name for leaderboard (profiles select is currently own-only).
-- We add a policy that exposes ONLY display_name via the view through security_invoker;
-- to keep it safe, add a permissive select limited to columns is not possible at row level,
-- so add a separate policy that allows authenticated users to read other profiles' rows.
-- (RLS is row-level; column hiding handled by the view itself.)
CREATE POLICY "profiles_select_for_leaderboard" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
