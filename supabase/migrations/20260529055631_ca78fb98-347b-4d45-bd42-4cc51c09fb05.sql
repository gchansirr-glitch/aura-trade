
-- 1. Lock down profiles SELECT to own row + admin only
DROP POLICY IF EXISTS "profiles_select_for_leaderboard" ON public.profiles;

CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- 2. Lock down discipline_scores SELECT to own row only
-- Leaderboard reads via the existing leaderboard_view (owned by postgres) which bypasses RLS.
DROP POLICY IF EXISTS "ds_select_all_auth" ON public.discipline_scores;

CREATE POLICY "ds_select_own"
ON public.discipline_scores FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Ensure leaderboard_view stays readable
GRANT SELECT ON public.leaderboard_view TO authenticated;

-- 3. Remove duplicate journal-charts storage policies that apply to {public} (includes anon)
DROP POLICY IF EXISTS "Users delete own journal charts" ON storage.objects;
DROP POLICY IF EXISTS "Users update own journal charts" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own journal charts" ON storage.objects;
-- Authenticated-only equivalents ("Owners ..." / "Public read journal charts") already exist.
