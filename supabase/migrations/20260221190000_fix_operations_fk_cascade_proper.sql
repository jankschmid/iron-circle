-- Drop the existing constraint
ALTER TABLE user_operations 
DROP CONSTRAINT IF EXISTS user_operations_template_id_fkey;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE user_operations
ADD CONSTRAINT user_operations_template_id_fkey
FOREIGN KEY (template_id) 
REFERENCES operations_templates(id) 
ON DELETE CASCADE;
