import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const cookieStore = await cookies();

    // 1. Auth Check
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) { return cookieStore.get(name)?.value; },
                set(name, value, options) { try { cookieStore.set({ name, value, ...options }); } catch (error) { } },
                remove(name, options) { try { cookieStore.delete({ name, ...options }); } catch (error) { } },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single();
    if (!profile?.is_super_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Check DeepL Key
    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Server Error: Missing DeepL API Key' }, { status: 500 });
    }

    try {
        const { targetLang = 'DE' } = await request.json();

        // 3. Fetch Missing Translations
        const { data: allTranslations, error: fetchError } = await supabase
            .from('app_translations')
            .select('*');

        if (fetchError) throw fetchError;

        // Filter for missing keys in targetLang
        const missingKeys = allTranslations.filter(t => {
            const val = t.translations?.[targetLang.toLowerCase()]; // DB uses lowercase codes (de, en)
            return !val || val.trim() === '';
        });

        if (missingKeys.length === 0) {
            return NextResponse.json({ message: 'No missing translations found.', count: 0 });
        }

        // DeepL limit per request is 50 text items
        const chunkSize = 50;
        let updatedCount = 0;

        for (let i = 0; i < missingKeys.length; i += chunkSize) {
            const batch = missingKeys.slice(i, i + chunkSize);
            const textsToTranslate = batch.map(t => t.key.replace(/_/g, ' '));

            console.log(`DeepL: Translating batch ${i / chunkSize + 1} (${batch.length} keys) to ${targetLang}...`);

            try {
                const params = new URLSearchParams();
                params.append('target_lang', targetLang.toUpperCase());
                params.append('source_lang', 'EN');
                textsToTranslate.forEach(text => params.append('text', text));

                const res = await fetch('https://api-free.deepl.com/v2/translate', {
                    method: 'POST',
                    headers: {
                        'Authorization': `DeepL-Auth-Key ${apiKey}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: params
                });

                if (!res.ok) {
                    const errText = await res.text();
                    console.error(`DeepL Batch Error: ${errText}`);
                    continue; // Skip this batch but try next
                }

                const data = await res.json();
                const translations = data.translations;

                // Update Database for this batch
                for (let j = 0; j < batch.length; j++) {
                    const item = batch[j];
                    const translatedText = translations[j].text;

                    if (translatedText) {
                        const updatedTranslations = {
                            ...item.translations,
                            [targetLang.toLowerCase()]: translatedText
                        };

                        const updatedFlags = {
                            ...(item.flags || {}),
                            [targetLang.toLowerCase()]: 'auto'
                        };

                        const { error: updateError } = await supabase
                            .from('app_translations')
                            .update({
                                translations: updatedTranslations,
                                flags: updatedFlags
                            })
                            .eq('id', item.id);

                        if (!updateError) updatedCount++;
                    }
                }
            } catch (batchErr) {
                console.error("Batch processing error:", batchErr);
            }
        }

        return NextResponse.json({
            message: `Successfully translated ${updatedCount} keys with DeepL.`,
            count: updatedCount
        });

    } catch (err) {
        console.error("Auto-Translate Critical Error:", err);
        return NextResponse.json({
            error: err.message || 'Unknown Server Error',
            details: err.stack
        }, { status: 500 });
    }
}
