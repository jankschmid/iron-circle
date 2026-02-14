const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotifications() {
    console.log("Checking notifications...");

    // Fetch last 5 notifications
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Last 5 Notifications:");
    console.table(data.map(n => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        title: n.title,
        read: n.read,
        data: JSON.stringify(n.data)
    })));
}

checkNotifications();
