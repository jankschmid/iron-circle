-- Create the contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow ANYONE (even guests) to insert contact messages
CREATE POLICY "Anyone can insert contact messages" ON contact_messages
FOR INSERT WITH CHECK (true);

-- Only Super Admins can view or update messages
CREATE POLICY "Super Admins can view contact messages" ON contact_messages
FOR SELECT USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
);

CREATE POLICY "Super Admins can update contact messages" ON contact_messages
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = true)
);
