-- Migration: Support Impersonation System

-- 1. Extend gyms table with support fields
ALTER TABLE public.gyms 
ADD COLUMN IF NOT EXISTS support_access_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS support_expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Create support_audit_logs table
CREATE TABLE IF NOT EXISTS public.support_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_performed TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.support_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies for support_audit_logs

-- Gym Admins can view logs for their own gym
CREATE POLICY "Gym Admins can view audit logs"
ON public.support_audit_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_gyms 
        WHERE user_gyms.gym_id = support_audit_logs.gym_id 
        AND user_gyms.user_id = auth.uid() 
        AND user_gyms.role IN ('admin', 'owner')
    )
);

-- Super Admins can view and insert logs
CREATE POLICY "Super Admins can view and write audit logs"
ON public.support_audit_logs
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
    )
);
