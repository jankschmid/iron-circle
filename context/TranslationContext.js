"use client";

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { PreferenceUtils } from '@/lib/preferences';

const TranslationContext = createContext();

export function TranslationProvider({ children }) {
    const supabase = createClient();
    const { user } = useStore();

    // State
    const [translations, setTranslations] = useState({}); // { "Key": { de: "...", es: "..." } }
    const [language, setLanguage] = useState('en'); // Default language
    const [supportedLanguages, setSupportedLanguages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Cache for missing keys to prevent spamming DB within session
    const missingKeysRef = useRef(new Set());

    // 1. Load Initial Data (Languages + Translations)
    useEffect(() => {
        const init = async () => {
            try {
                // Fetch Languages
                const { data: langs } = await supabase
                    .from('app_languages')
                    .select('*')
                    .eq('is_active', true)
                    .order('label');

                if (langs && langs.length > 0) {
                    setSupportedLanguages(langs);
                } else {
                    // Fallback
                    setSupportedLanguages([{ code: 'en', label: 'English', flag: '🇬🇧' }]);
                }

                // Load saved language
                const saved = await PreferenceUtils.get('app_language');
                if (saved) setLanguage(saved);

                // Fetch Translations
                const { data: trans } = await supabase.from('app_translations').select('*');
                if (trans) {
                    const map = {};
                    trans.forEach(item => {
                        map[item.key] = item.translations;
                    });
                    setTranslations(map);
                }
            } catch (err) {
                console.error("i18n Init Error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    // 3. Change Language
    const changeLanguage = async (lang) => {
        setLanguage(lang);
        await PreferenceUtils.set('app_language', lang);
    };

    // 4. Auto-Discovery Insert (Debounced/Buffered could be better, but simple for now)
    const registerMissingKey = async (key) => {
        if (missingKeysRef.current.has(key)) return; // Already tried
        missingKeysRef.current.add(key);

        console.log(`i18n: Auto-discovering key: "${key}"`);

        // Check Admin Permission explicitly before call (though RLS also protects)
        // Check Admin Permission explicitly before call (though RLS also protects)
        // TEMPORARY: Allow all users to discover keys for rollout
        if (!user) {
            return;
        }

        try {
            const { error } = await supabase
                .from('app_translations')
                .insert({ key, translations: {} })
                .select()
                .single();

            // PostgREST 23505 (Unique Violation) might happen if race condition, ignore it.
            if (error && error.code !== '23505') {
                console.error("i18n: Auto-insert failed", error);
            } else {
                console.log("i18n: Auto-inserted key.");
                // Optimistically add to local state to avoid refetch
                setTranslations(prev => ({ ...prev, [key]: {} }));
            }

        } catch (err) {
            console.error("i18n: Auto-insert exception", err);
        }
    };

    // 5. The generic t() function
    const t = (key) => {
        if (!key) return '';

        const entry = translations[key];

        // If key found
        if (entry) {
            // If translation exists for current language
            if (entry[language]) {
                return entry[language];
            }
            // If not found in current language, fallback to key (English)
            return key;
        }

        // If key NOT found at all (and loaded)
        if (!isLoading) {
            // Trigger Auto-Discovery
            registerMissingKey(key);
        }

        // Return key as fallback
        return key;
    };

    return (
        <TranslationContext.Provider value={{ t, language, changeLanguage, translations, supportedLanguages }}>
            {children}
        </TranslationContext.Provider>
    );
}

// Hook
export const useTranslation = () => {
    return useContext(TranslationContext);
};
