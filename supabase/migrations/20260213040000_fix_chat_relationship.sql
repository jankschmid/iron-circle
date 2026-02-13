-- Fix Message Sender Relationship
-- 1. Access Control: Ensure Profiles are viewable (required for the join)
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles" ON "public"."profiles";
CREATE POLICY "Public profiles" ON "public"."profiles" FOR SELECT USING (true);

-- 2. Schema: Repoint FK to public.profiles (instead of auth.users)
-- We drop it first because it likely exists pointing to auth.users, which PostgREST cannot "see".
ALTER TABLE "public"."messages" DROP CONSTRAINT IF EXISTS "messages_sender_id_fkey";

ALTER TABLE "public"."messages" 
ADD CONSTRAINT "messages_sender_id_fkey" 
FOREIGN KEY ("sender_id") 
REFERENCES "public"."profiles" ("id") 
ON DELETE CASCADE;
