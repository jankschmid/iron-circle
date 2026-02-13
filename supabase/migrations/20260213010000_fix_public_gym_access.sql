-- Allow public read access to gyms (fixes "Gym not found" error)
DROP POLICY IF EXISTS "Gyms are viewable by everyone" ON "public"."gyms";
CREATE POLICY "Gyms are viewable by everyone" ON "public"."gyms"
FOR SELECT USING (true);

-- Allow public read access to communities
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON "public"."communities";
CREATE POLICY "Communities are viewable by everyone" ON "public"."communities"
FOR SELECT USING (true);
