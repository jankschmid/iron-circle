
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin access 
);

async function verify() {
    console.log("Verifying Database State...");

    // 1. Check profiles columns
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('xp, level')
        .limit(1);

    if (pError) {
        if (pError.message.includes('does not exist')) {
            console.log("❌ 'xp' or 'level' columns MISSING in 'profiles'.");
        } else {
            console.log("⚠️ Error checking profiles:", pError.message);
        }
    } else {
        console.log("✅ 'xp' and 'level' columns EXIST in 'profiles'.");
    }

    // 2. Check workout_likes table
    const { data: likes, error: lError } = await supabase
        .from('workout_likes')
        .select('*')
        .limit(1);

    if (lError) {
        console.log("❌ 'workout_likes' table MISSING or inaccessible.");
    } else {
        console.log("✅ 'workout_likes' table EXISTS.");
    }

    // 3. Check RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_gym_leaderboard', { p_gym_id: '00000000-0000-0000-0000-000000000000', p_metric: 'volume' });

    if (rpcError) {
        if (rpcError.message.includes('function get_gym_leaderboard') && rpcError.message.includes('does not exist')) {
            console.log("❌ 'get_gym_leaderboard' RPC MISSING.");
        } else {
            // It might error due to invalid UUID, but if function exists it throws a different error usually or returns empty
            console.log("✅ 'get_gym_leaderboard' RPC ALMOST CERTAINLY EXISTS (Error was not 'does not exist'):", rpcError.message);
        }
    } else {
        console.log("✅ 'get_gym_leaderboard' RPC EXISTS and works.");
    }
}

verify();
