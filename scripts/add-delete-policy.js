// Script to add RLS DELETE policy for conversation_participants
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addDeletePolicy() {
    console.log('Adding DELETE policy for conversation_participants...');

    const sql = `
        CREATE POLICY IF NOT EXISTS "Users can delete their own conversation participations"
        ON conversation_participants
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    `;

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('Error creating policy:', error);
            // Try alternative method
            console.log('Trying direct SQL execution...');
            const { error: directError } = await supabase.from('_sql').insert({ query: sql });
            if (directError) {
                console.error('Direct SQL also failed:', directError);
                console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
                console.log(sql);
            }
        } else {
            console.log('✅ Policy created successfully!');
            console.log('Chat deletion should now work.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
        console.log(sql);
    }
}

addDeletePolicy();
