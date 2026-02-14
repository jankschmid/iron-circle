const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function revertRoles() {
    console.log("Fetching users via Admin API...");
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    const ownerEmail = 'janschmid.office@gmail.com';
    const ownerUser = users.find(u => u.email === ownerEmail);

    if (!ownerUser) {
        console.error("Owner not found!");
        return;
    }

    console.log(`Found Owner: ${ownerUser.email} (${ownerUser.id})`);

    // 1. Set Owner
    const { error: ownerError } = await supabase
        .from('user_gyms')
        .update({ role: 'owner', label: 'Owner' })
        .eq('user_id', ownerUser.id);

    if (ownerError) console.error("Error setting owner:", ownerError);
    else console.log("Set Owner role successfully.");

    // 2. Set others to Member (or Trainer)
    const otherUsers = users.filter(u => u.email !== ownerEmail);
    for (const u of otherUsers) {
        let role = 'member';
        let label = 'Member';

        if (u.email.includes('trainer') || u.email.includes('coach')) {
            role = 'trainer';
            label = 'Trainer';
        }

        console.log(`Setting ${u.email} to ${role}...`);

        const { error: updateError } = await supabase
            .from('user_gyms')
            .update({ role: role, label: label })
            .eq('user_id', u.id);

        if (updateError) console.error(`Error updating ${u.email}:`, updateError);
        else console.log(`Updated ${u.email}`);
    }
}

revertRoles();
