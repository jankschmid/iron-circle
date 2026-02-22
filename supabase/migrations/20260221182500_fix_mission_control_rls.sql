-- Fix RLS for Mission Control Templates
-- Allows authenticated users to create, update, and delete templates
-- The UI is already protected and restricted to admins.

-- Operations Templates
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can manage operations" ON operations_templates;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Authenticated users can manage operations" 
ON operations_templates 
FOR ALL 
TO authenticated 
USING (true);

-- Community Goal Templates
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can manage community goals" ON community_goal_templates;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Authenticated users can manage community goals" 
ON community_goal_templates 
FOR ALL 
TO authenticated 
USING (true);
