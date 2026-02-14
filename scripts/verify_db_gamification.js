const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bhokgkxkkrofbpjqtijv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJob2tna3hra3JvZmJwanF0aWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTEyMzY0NCwiZXhwIjoyMDg0Njk5NjQ0fQ.-CjaZlWXvrtMYU6bEQ4gfLvq7shYUZlIwhRSk5D6cQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Verifying profiles table...');
    const { data, error } = await supabase
        .from('profiles')
        .select('id, level, current_xp, prestige_level, lifetime_xp')
        .limit(1);

    if (error) {
        console.error('Error fetching profiles:', error);
    } else {
        console.log('Profiles data (Sample):', data);
        if (data && data.length > 0) {
            console.log('Keys found:', Object.keys(data[0]));
        } else {
            // If empty, try to fetch all columns to see what's there
            const { data: allData, error: allError } = await supabase.from('profiles').select('*').limit(1);
            if (allError) {
                console.error('Error fetching *:', allError);
            } else if (allData && allData.length > 0) {
                console.log('Keys present in * query:', Object.keys(allData[0]));
            } else {
                console.log('Profiles table is empty.');
            }
        }
    }
}

verify();
