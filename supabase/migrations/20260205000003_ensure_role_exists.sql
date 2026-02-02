-- Migration: Ensure Role Column Exists
-- Date: 2026-02-05

-- Safety check to ensure the column exists. 
-- If it was missed in a previous migration or failed silently, this will catch it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_gyms' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE user_gyms ADD COLUMN role TEXT DEFAULT 'member';
    END IF;
END $$;
