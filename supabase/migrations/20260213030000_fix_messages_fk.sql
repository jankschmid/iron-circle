-- Add Foreign Key to messages.sender_id referencing profiles.id
-- This allows PostgREST to resolve the 'sender' relation.

ALTER TABLE "public"."messages"
ADD CONSTRAINT "messages_sender_id_fkey"
FOREIGN KEY ("sender_id")
REFERENCES "public"."profiles" ("id")
ON DELETE CASCADE;
