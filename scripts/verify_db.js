
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
const envLocal = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = dotenv.parse(envLocal);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function verify() {
    console.log('Verifying community_goal_templates table...');

    // Test 1: Query table
    const { data, error } = await supabase.from('community_goal_templates').select('*').limit(1);

    if (error) {
        console.error('❌ Error querying table:', error);

        if (error.code === 'PGRST205') { // specific cache/missing table error
            console.error('-> Table does not exist in schema cache.');
        }
    } else {
        console.log('✅ Table exists and is accessible!');
        console.log('Row count:', data.length);
    }
}

verify();
