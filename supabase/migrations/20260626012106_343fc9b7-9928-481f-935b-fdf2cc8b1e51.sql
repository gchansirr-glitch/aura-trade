-- Restore execute permission required for RLS policies that call has_role().
-- This keeps admin membership stored in user_roles while allowing authenticated requests
-- to pass policies such as profiles/payment_requests/admin notification reads.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Ensure the authorized account has exactly the admin role after the admin-lock migration.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE lower(email) = lower('acagaming75@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND ur.role = 'admin'::public.app_role
  AND lower(p.email) <> lower('acagaming75@gmail.com');