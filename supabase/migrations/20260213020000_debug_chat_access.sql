-- ALLOW ALL access to messages for authenticated users (DEBUGGING)
-- This confirms if RLS is the blocker.

DROP POLICY IF EXISTS "Users can view messages" ON "public"."messages";
CREATE POLICY "Users can view messages" ON "public"."messages"
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert messages" ON "public"."messages";
CREATE POLICY "Users can insert messages" ON "public"."messages"
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
