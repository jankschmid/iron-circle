
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listGyms() {
    const { data, error } = await supabase.from('gyms').select('id, name, address, created_by, location');
    if (error) {
        console.error(error);
    } else {
        console.log("Found " + data.length + " gyms:");
        data.forEach(g => {
            console.log(`[${g.id}] Name: ${g.name}, Addr: ${g.address || 'N/A'}, Loc: ${g.location}, Creator: ${g.created_by}`);
        });
    }
}

listGyms();
