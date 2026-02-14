const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRoles() {
    // 1. Get the Gym ID(s)
    const { data: gyms } = await supabase.from('gyms').select('id, name').limit(5);
    if (!gyms || gyms.length === 0) {
        console.error("No gyms found!");
        return;
    }
    console.log("Found gyms:", gyms);

    // 2. Get the User ID (We need to update specific user)
    // We can't list users easily with client, but we can search profiles?
    // Or just update ALL user_gyms to owner for testing? NO, dangerous.

    // Better: Ask for email or just pick the first user found in profiles?
    // Let's get "jansch..." or similar if known, or just update based on existing user_gyms?

    // Strategy: Update ALL existing user_gyms rows to 'owner' for now?
    // The user said "I lost access".
    // Let's fetch current user_gyms and upgrade them.

    const { data: userGyms } = await supabase.from('user_gyms').select('*');
    if (!userGyms || userGyms.length === 0) {
        console.log("No user_gyms found to upgrade. Creating one?");
        // If no connections, we need to create one.
        // We need a user ID.
        // Let's prompt or just fail?
        // Let's try to find a profile.
        const { data: profiles } = await supabase.from('profiles').select('id, email').limit(1);
        if (profiles && profiles.length > 0) {
            const userId = profiles[0].id; // Just pick the first one?
            const gymId = gyms[0].id;
            console.log(`Creating owner link for ${profiles[0].email} -> ${gyms[0].name}`);

            const { error } = await supabase.from('user_gyms').insert({
                user_id: userId,
                gym_id: gymId,
                role: 'owner',
                label: 'Owner'
            });
            if (error) console.error(error);
            else console.log("Success!");
        }
        return;
    }

    // Upgrade existing
    console.log(`Upgrading ${userGyms.length} connections to 'owner'...`);
    for (const ug of userGyms) {
        const { error } = await supabase
            .from('user_gyms')
            .update({ role: 'owner', label: 'Owner' })
            .eq('user_id', ug.user_id)
            .eq('gym_id', ug.gym_id);

        if (error) console.error("Update failed:", error);
        else console.log(`Upgraded ${ug.user_id} in ${ug.gym_id}`);
    }
}

fixRoles();
