-- Add index to improve fetchProfile performance
CREATE INDEX IF NOT EXISTS idx_user_gyms_user_id ON public.user_gyms(user_id);

-- Add index for gym monitors lookup
CREATE INDEX IF NOT EXISTS idx_gym_monitors_pairing_code ON public.gym_monitors(pairing_code);
