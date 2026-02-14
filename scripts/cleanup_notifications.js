const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupBadNotifications() {
    console.log("Cleaning up bad notifications...");

    // Fetch all trainer_invites
    const { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'trainer_invite');

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    let deletedCount = 0;
    for (const n of notifs) {
        // If data is missing or inviterId is missing
        if (!n.data || !n.data.inviterId) {
            console.log(`Deleting invalid notification ${n.id} (No inviterId)`);
            await supabase.from('notifications').delete().eq('id', n.id);
            deletedCount++;
        }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} invalid notifications.`);
}

cleanupBadNotifications();
