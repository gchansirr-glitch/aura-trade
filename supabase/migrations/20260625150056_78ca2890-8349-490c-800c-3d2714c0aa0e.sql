
-- ============================================================
-- 1. ADMIN LOCK: acagaming75@gmail.com only
-- ============================================================
-- Remove any existing admin roles that don't belong to the authorized email
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id NOT IN (
    SELECT id FROM public.profiles WHERE email = 'acagaming75@gmail.com'
  );

-- Trigger to prevent any other email from being granted admin
CREATE OR REPLACE FUNCTION public.enforce_single_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  IF NEW.role = 'admin' THEN
    SELECT email INTO user_email FROM public.profiles WHERE id = NEW.user_id;
    IF user_email IS DISTINCT FROM 'acagaming75@gmail.com' THEN
      RAISE EXCEPTION 'Admin role can only be assigned to the authorized account';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_admin ON public.user_roles;
CREATE TRIGGER trg_enforce_single_admin
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_admin();

-- ============================================================
-- 2. NEWS_EVENTS TABLE (Forex Factory)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.news_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  title TEXT NOT NULL,
  country TEXT,
  currency TEXT,
  impact TEXT NOT NULL CHECK (impact IN ('low','medium','high','holiday')),
  event_time TIMESTAMPTZ NOT NULL,
  actual TEXT,
  forecast TEXT,
  previous TEXT,
  source_url TEXT,
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_events_time ON public.news_events(event_time);
CREATE INDEX IF NOT EXISTS idx_news_events_impact ON public.news_events(impact);

GRANT SELECT ON public.news_events TO authenticated, anon;
GRANT ALL ON public.news_events TO service_role;

ALTER TABLE public.news_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_events_read_all" ON public.news_events
  FOR SELECT USING (true);

CREATE TRIGGER trg_news_events_updated
  BEFORE UPDATE ON public.news_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. PUSH_SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_own" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. NOTIFICATION_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_filter TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.notification_logs TO authenticated;
GRANT ALL ON public.notification_logs TO service_role;

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_logs_admin_read" ON public.notification_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "notif_logs_admin_insert" ON public.notification_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Enable extensions for scheduling
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
