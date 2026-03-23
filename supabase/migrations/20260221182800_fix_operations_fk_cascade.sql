-- Fix Foreign Key Constraint on user_operations
-- Allows deleting operations_templates by cascading the delete to user_operations

DO $$ BEGIN
    -- Drop the existing constraint
    ALTER TABLE user_operations 
    DROP CONSTRAINT IF EXISTS user_operations_template_id_fkey;
    
    -- Re-add the constraint with ON DELETE CASCADE
    ALTER TABLE user_operations
    ADD CONSTRAINT user_operations_template_id_fkey
    FOREIGN KEY (template_id) 
    REFERENCES operations_templates(id) 
    ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
