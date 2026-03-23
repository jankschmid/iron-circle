import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    console.log("Fixing pending submissions...");
    // 1. Get all submissions
    const { data: subs } = await supabase.from('challenge_submissions').select('*');
    if (!subs) return;

    // 2. Aggregate progress
    const progressMap = {};
    for (const sub of subs) {
        const key = `${sub.challenge_id}_${sub.user_id}`;
        progressMap[key] = (progressMap[key] || 0) + sub.value;
    }

    // 3. Update participants
    for (const key of Object.keys(progressMap)) {
        const [challenge_id, user_id] = key.split('_');
        console.log(`Updating ${user_id} in ${challenge_id} to ${progressMap[key]}`);
        await supabase.from('challenge_participants')
            .update({ progress: progressMap[key] })
            .eq('challenge_id', challenge_id)
            .eq('user_id', user_id);
    }

    // 4. Mark all as verified
    await supabase.from('challenge_submissions').update({ status: 'verified' }).eq('status', 'pending');
    console.log("Done!");
}

fix();
