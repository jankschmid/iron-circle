const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/jansc/.gemini/antigravity/scratch/iron-circle/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching gym_challenges directly...");
    const { data: direct, error: e1 } = await supabase.from('gym_challenges').select('*');
    console.log("Direct:", direct?.length, "Error:", e1);

    console.log("Fetching v_gym_challenges view...");
    const { data: viewData, error: e2 } = await supabase.from('v_gym_challenges').select('*');
    console.log("View:", viewData?.length, "Error:", e2);
}

run();
