const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    console.log("Checking all user_gyms...");

    // 1. Get all user_gyms
    const { data: userGyms, error } = await supabase
        .from('user_gyms')
        .select('user_id, gym_id, role, gyms(name)');

    if (error) {
        console.error("Error fetching user_gyms:", error);
        return;
    }

    // Get profiles manually since join failed previously? Or try join again if I fixed it?
    // Let's just fetch profiles separately to be safe.
    const userIds = userGyms.map(ug => ug.user_id);
    const { data: profiles, error: pError } = await supabase.from('profiles').select('id, username, email').in('id', userIds);
    if (pError) console.error("Profiles Error:", pError);
    console.log("Profiles Found:", profiles?.length, profiles);
    const profileMap = {};
    profiles?.forEach(p => profileMap[p.id] = p);

    const tableData = userGyms.map(r => ({
        UserID: r.user_id,
        Username: profileMap[r.user_id]?.username || 'Unknown',
        Email: profileMap[r.user_id]?.email || 'Unknown',
        GymID: r.gym_id,
        GymName: r.gyms?.name,
        Role: r.role
    }));

    tableData.forEach(r => {
        console.log(`User: ${r.Email} (${r.Username}) | Role: ${r.Role} | Gym: ${r.GymName}`);
        console.log(`ID: ${r.UserID}`);
        console.log('---');
    });

    // 2. Check if there are ANY owners
    const owners = userGyms.filter(r => r.role === 'owner');
    if (owners.length === 0) {
        console.warn("WARNING: No owners found in the database!");
    } else {
        console.log(`Found ${owners.length} owners.`);
    }
}

checkRoles();
