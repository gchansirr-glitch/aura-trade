-- Add ban status and premium expiration to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_expires_at timestamp with time zone;

-- Allow admins to view all payment requests list (already covered) and list all profiles
-- The existing "Users can view their own profile" already includes admin via has_role, good.

-- Allow admins to delete payment requests if needed (optional, skip)
