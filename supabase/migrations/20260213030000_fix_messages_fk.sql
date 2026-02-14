DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_id_fkey') THEN
        ALTER TABLE "public"."messages"
        ADD CONSTRAINT "messages_sender_id_fkey"
        FOREIGN KEY ("sender_id")
        REFERENCES "public"."profiles" ("id")
        ON DELETE CASCADE;
    END IF;
END $$;
