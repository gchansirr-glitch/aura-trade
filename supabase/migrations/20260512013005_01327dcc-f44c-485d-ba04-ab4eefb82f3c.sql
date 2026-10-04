DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id NOT IN (
    SELECT id FROM public.profiles WHERE lower(email) = 'acagaming75@gmail.com'
  );

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles WHERE lower(email) = 'acagaming75@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;