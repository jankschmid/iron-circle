
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("--- DEBUG ADMIN GYMS ---");

    // 1. Direct Query
    const { data: gyms, error: gymError } = await supabase
        .from('gyms')
        .select('*');

    if (gymError) console.error("Direct Gym Error:", gymError);
    else console.log(`Direct Gym Count: ${gyms.length}`, gyms.map(g => ({ id: g.id, name: g.name })));

    // 2. RPC Call
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_gyms_paginated', {
        p_page_size: 10,
        p_page: 0,
        p_search: ''
    });

    if (rpcError) {
        console.error("RPC Error:", rpcError);
    } else {
        console.log("RPC Data Type:", typeof rpcData);
        console.log("RPC Data IsArray:", Array.isArray(rpcData));
        console.log("RPC Data Raw:", JSON.stringify(rpcData, null, 2));

        if (Array.isArray(rpcData) && rpcData.length > 0) {
            console.log("RPC Items:", rpcData[0].data?.length);
        }
    }
}

run();
