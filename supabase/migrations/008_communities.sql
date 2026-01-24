-- Create communities table
CREATE TABLE IF NOT EXISTS public.communities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id uuid REFERENCES public.gyms(id) ON DELETE CASCADE UNIQUE,
    name text NOT NULL,
    description text,
    avatar_url text,
    member_count int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id)
);

-- Create community_members table
CREATE TABLE IF NOT EXISTS public.community_members (
    community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    role text DEFAULT 'member',
    PRIMARY KEY (community_id, user_id)
);

-- Enable RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for communities
CREATE POLICY "Communities are viewable by everyone" ON public.communities
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create communities" ON public.communities
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Community creators can update their communities" ON public.communities
    FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for community_members
CREATE POLICY "Community members are viewable by everyone" ON public.community_members
    FOR SELECT USING (true);

CREATE POLICY "Users can join communities" ON public.community_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities" ON public.community_members
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.communities
        SET member_count = member_count + 1
        WHERE id = NEW.community_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.communities
        SET member_count = member_count - 1
        WHERE id = OLD.community_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update member count
CREATE TRIGGER community_member_count_trigger
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_communities_gym_id ON public.communities(gym_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON public.community_members(community_id);
