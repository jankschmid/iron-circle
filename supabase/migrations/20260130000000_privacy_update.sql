-- Add gym_type to communities
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS gym_type text DEFAULT 'community' CHECK (gym_type IN ('community', 'verified_partner'));

-- Add consent and role to community_members
ALTER TABLE community_members 
ADD COLUMN IF NOT EXISTS monitor_consent_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS role text DEFAULT 'member' CHECK (role IN ('member', 'trainer', 'admin'));

-- Add privacy_settings to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{"profile_visibility": "public", "gym_monitor_streaming": true, "live_status": true}'::jsonb;
