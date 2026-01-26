
-- Add policies for Gym Creators to Update and Delete their gyms

CREATE POLICY "Creators can update own gyms" ON "public"."gyms"
    FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can delete own gyms" ON "public"."gyms"
    FOR DELETE
    USING (auth.uid() = created_by);
