const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const exercises = [
    // Sport
    { name: 'Basketball', type: 'Sport', muscle: 'Full Body', default_duration: 3600 },
    { name: 'Soccer', type: 'Sport', muscle: 'Legs', default_duration: 5400 },
    { name: 'Tennis', type: 'Sport', muscle: 'Full Body', default_duration: 3600 },
    { name: 'Volleyball', type: 'Sport', muscle: 'Full Body', default_duration: 3600 },
    { name: 'Swimming', type: 'Sport', muscle: 'Full Body', default_duration: 1800 },
    { name: 'Cycling (Outdoor)', type: 'Sport', muscle: 'Legs', default_duration: 3600 },
    { name: 'Running (Outdoor)', type: 'Sport', muscle: 'Legs', default_duration: 1800 },
    { name: 'Golf', type: 'Sport', muscle: 'Core', default_duration: 14400 },
    { name: 'Boxing', type: 'Sport', muscle: 'Full Body', default_duration: 1800 },
    { name: 'Martial Arts', type: 'Sport', muscle: 'Full Body', default_duration: 3600 },
    { name: 'Climbing', type: 'Sport', muscle: 'Full Body', default_duration: 3600 },

    // Mobility
    { name: 'Foam Rolling', type: 'Mobility', muscle: 'Full Body', default_duration: 900 },
    { name: 'Dynamic Warmup', type: 'Mobility', muscle: 'Full Body', default_duration: 600 },
    { name: 'Hip Opener Sequence', type: 'Mobility', muscle: 'Legs', default_duration: 900 },
    { name: 'Shoulder Dislocates', type: 'Mobility', muscle: 'Shoulders', default_duration: 300 },
    { name: 'SMR (Self Myofascial Release)', type: 'Mobility', muscle: 'Full Body', default_duration: 900 },
    { name: 'Deep Squat Sit', type: 'Mobility', muscle: 'Legs', default_duration: 300 },
    { name: 'Ankle Mobility', type: 'Mobility', muscle: 'Legs', default_duration: 300 },
    { name: 'Wrist Mobility', type: 'Mobility', muscle: 'Forearms', default_duration: 300 },

    // Walk
    { name: 'Light Walk', type: 'Walk', muscle: 'Legs', default_duration: 1800 },
    { name: 'Brisk Walk', type: 'Walk', muscle: 'Legs', default_duration: 1800 },
    { name: 'Hiking', type: 'Walk', muscle: 'Legs', default_duration: 7200 },
    { name: 'Rucking (Weighted Walk)', type: 'Walk', muscle: 'Full Body', default_duration: 1800 }
];

async function seed() {
    console.log("Seeding", exercises.length, "activities...");

    // We can't do upsert easily without constraints, so we'll do check-then-insert loop or upsert if name is unique
    // Assuming 'name' is unique constraint? Maybe not.
    // Let's try upsert on name?

    // First, check what exists.
    const { data: existing } = await supabase.from('exercises').select('name');
    const existingNames = new Set(existing?.map(e => e.name) || []);

    const toInsert = exercises.filter(e => !existingNames.has(e.name)); // Avoid duplicates manually if no unique constraint

    if (toInsert.length === 0) {
        console.log("All exercises already exist.");
        return;
    }

    const { data, error } = await supabase
        .from('exercises')
        .insert(toInsert)
        .select();

    if (error) {
        console.error("Error seeding:", error);
    } else {
        console.log("Success! Inserted:", data.length);
    }
}

seed();
