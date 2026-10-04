
-- discipline_events: writes only via score_journal_entry() trigger
CREATE POLICY "No client inserts on discipline_events" ON public.discipline_events FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No client updates on discipline_events" ON public.discipline_events FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes on discipline_events" ON public.discipline_events FOR DELETE TO authenticated USING (false);

-- profiles: created by handle_new_user() trigger; block client inserts
CREATE POLICY "No client inserts on profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (false);

-- user_roles: block all client writes to prevent privilege escalation
CREATE POLICY "No client inserts on user_roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No client updates on user_roles" ON public.user_roles FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes on user_roles" ON public.user_roles FOR DELETE TO authenticated USING (false);
