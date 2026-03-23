require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const { data: gym } = await supabase.from('gyms').select('id').limit(1).single();
    if (!gym) return console.log("No gym found");

    const payload = {
        gym_id: gym.id,
        title: "Test Challenge",
        description: null,
        team_type: "none",
        start_date: new Date().toISOString(),
        end_date: null,
        target_value: null,
        target_unit: "workouts",
        xp_reward_1st: 1000,
        xp_reward_2nd: 500,
        xp_reward_3rd: 500,
        xp_reward_participation: 200,
        is_published: true
    };

    const { data, error } = await supabase.from('gym_challenges').insert(payload).select('id').single();
    console.log("Insert result:");
    console.log(error);
}

testInsert();
