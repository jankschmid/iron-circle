require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

// Initialize Supabase client with service role key
// auth.autoRefreshToken: false, auth.persistSession: false are important for service role scripts
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    console.log('Verifying database access...');
    try {
        const { count, error: countError } = await supabase
            .from('app_translations')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error verifying database access:', countError);
            console.error('Make sure SUPABASE_SERVICE_ROLE_KEY is correct and has bypass RLS privileges.');
            process.exit(1);
        }
        console.log(`Database access verified. Current translation count: ${count}`);
    } catch (err) {
        console.error('Unexpected error during verification:', err);
        process.exit(1);
    }

    const sqlPath = path.join(__dirname, '../final_migration.sql');
    let sqlContent;
    try {
        sqlContent = fs.readFileSync(sqlPath, 'utf8');
    } catch (err) {
        console.error('Error reading final_migration.sql:', err);
        process.exit(1);
    }

    // Read file line by line to capture comments as categories
    const lines = sqlContent.split('\n');
    let currentCategory = 'General';
    const keysWithCategory = [];

    // Regex to match: ('Key', '{}') or ('Key', '{}'),
    const keyRegex = /\('([^']+)',\s*'\{\}'\)/;

    for (const line of lines) {
        const trimmed = line.trim();

        // Check for comment (Category)
        if (trimmed.startsWith('--') && trimmed.length > 3) {
            // Remove '--' and whitespace
            const cat = trimmed.replace(/^--\s*/, '').trim();
            // Ignore numbered comments like "1. Add flags"
            if (!/^\d+\./.test(cat) && !cat.startsWith('Run this') && !cat.startsWith('FINAL MIGRATION')) {
                currentCategory = cat;
            }
        }

        // Check for key
        const match = keyRegex.exec(trimmed);
        if (match) {
            keysWithCategory.push({
                key: match[1],
                category: currentCategory
            });
        }
    }

    console.log(`Found ${keysWithCategory.length} keys (raw).`);

    // Deduplicate keys (keeping the last occurrence which usually has the correct category if redefined)
    const uniqueKeys = new Map();
    keysWithCategory.forEach(item => {
        uniqueKeys.set(item.key, item);
    });
    const finalKeys = Array.from(uniqueKeys.values());

    console.log(`Found ${finalKeys.length} unique keys to insert.`);

    // Batch insert (chunks of 100)
    const chunkSize = 100;
    for (let i = 0; i < finalKeys.length; i += chunkSize) {
        const chunk = finalKeys.slice(i, i + chunkSize).map(item => ({
            key: item.key,
            translations: {},
            flags: { category: item.category } // Store category in 'flags' JSONB
        }));

        console.log(`Inserting chunk ${Math.floor(i / chunkSize) + 1}...`);

        const { error } = await supabase
            .from('app_translations')
            .upsert(chunk, { onConflict: 'key', ignoreDuplicates: false });

        if (error) {
            console.error('Error inserting chunk:', error);
        } else {
            console.log(`Chunk ${Math.floor(i / chunkSize) + 1} inserted successfully.`);
        }
    }

    console.log('Seeding complete!');

    /* 
       Optional: Trigger a translation for all empty keys if you have that logic.
       For now, we just seed the keys so they appear in the Admin UI.
    */
}

main();
