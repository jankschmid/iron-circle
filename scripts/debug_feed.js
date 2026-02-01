
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFK() {
    console.log("Checking foreign keys for 'workouts' table...");

    // Query postgres to get constraints
    // This is hard via js client unless we use rpc or just infer from error.
    // Actually, we can just try to run the alter table via a migration and if it fails (already exists) we notice.
    // Or we can try to query profiles directly via the join in a small snippet and see the error ourselves.

    const { data, error } = await supabase
        .from('workouts')
        .select(`
            id, 
            user_id,
            profile:profiles!fk_workouts_profiles (name)
        `)
        .limit(1);

    if (error) {
        console.log("Explicit FK join failed:", error.message);
        // If this fails, it means the FK 'fk_workouts_profiles' definitely doesn't exist or isn't detected.
    } else {
        console.log("Explicit FK join worked!", data);
    }

    // Standard join check
    const { data: d2, error: e2 } = await supabase
        .from('workouts')
        .select(`user_id, profile:profiles(name)`) // Try implicit by table name
        .limit(1);

    if (e2) {
        console.log("Implicit JOIN 'profile:profiles' failed:", e2.message);
    }

    const { data: d3, error: e3 } = await supabase
        .from('workouts')
        .select(`user_id, profile:user_id(name)`) // Try by column
        .limit(1);

    if (e3) {
        console.log("Column based JOIN 'profile:user_id' failed:", e3.message);
    }
}

checkFK();
