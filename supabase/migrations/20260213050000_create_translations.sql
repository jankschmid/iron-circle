-- Create Translations Table for Database-Driven i18n
CREATE TABLE IF NOT EXISTS "public"."app_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "translations" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "app_translations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "app_translations_key_key" UNIQUE ("key")
);

ALTER TABLE "public"."app_translations" OWNER TO "postgres";

-- Enable RLS
ALTER TABLE "public"."app_translations" ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_translations' AND policyname = 'Public Read Translations'
    ) THEN
        CREATE POLICY "Public Read Translations" 
        ON "public"."app_translations" 
        FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Policy: Super Admins can Insert (Auto-Discovery)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_translations' AND policyname = 'Admins Insert Translations'
    ) THEN
        CREATE POLICY "Admins Insert Translations" 
        ON "public"."app_translations" 
        FOR INSERT 
        WITH CHECK (
            (SELECT "is_super_admin" FROM "public"."profiles" WHERE "id" = "auth"."uid"()) = true
        );
    END IF;
END $$;

-- Policy: Super Admins can Update (Admin Dashboard)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_translations' AND policyname = 'Admins Update Translations'
    ) THEN
        CREATE POLICY "Admins Update Translations" 
        ON "public"."app_translations" 
        FOR UPDATE 
        USING (
            (SELECT "is_super_admin" FROM "public"."profiles" WHERE "id" = "auth"."uid"()) = true
        );
    END IF;
END $$;

-- Note: We might want to allow Deletes too for cleanup?
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_translations' AND policyname = 'Admins Delete Translations'
    ) THEN
        CREATE POLICY "Admins Delete Translations" 
        ON "public"."app_translations" 
        FOR DELETE 
        USING (
            (SELECT "is_super_admin" FROM "public"."profiles" WHERE "id" = "auth"."uid"()) = true
        );
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON TABLE "public"."app_translations" TO "postgres";
GRANT ALL ON TABLE "public"."app_translations" TO "anon";
GRANT ALL ON TABLE "public"."app_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."app_translations" TO "service_role";
