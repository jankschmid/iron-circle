-- Allow users to insert their own operations
CREATE POLICY "Users can insert own operations" 
ON user_operations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
