const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInvite() {
    console.log("Debugging Invite...");

    // 1. Get latest trainer relationship
    const { data: rels, error: relError } = await supabase
        .from('trainer_relationships')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (relError) {
        console.error("Error fetching relationships:", relError);
        return;
    }

    if (!rels || rels.length === 0) {
        console.log("No trainer relationships found.");
        return;
    }

    const invite = rels[0];
    console.log("Latest Invite:", invite);

    // 2. Check Notifications for this client
    const { data: notifs, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', invite.client_id);

    if (notifError) {
        console.error("Error fetching notifications:", notifError);
    } else {
        console.log(`Notifications for Client ${invite.client_id}:`, notifs);
    }

    // 3. Double check ALL notifications just in case
    const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });

    console.log("Total Notifications in Table:", count);
}

debugInvite();
