import { createBrowserClient } from '@supabase/ssr'

let browserClient = null;

export function createClient() {
    const isMonitor = typeof window !== 'undefined' && (
        window.location.pathname.includes('/gym/display') ||
        window.location.pathname.includes('/tv')
    );

    // Singleton Logic with HMR Support
    if (typeof window !== 'undefined') {
        if (window.__supabaseClient) return window.__supabaseClient;
    }

    const client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: !isMonitor,
                detectSessionInUrl: !isMonitor,
                autoRefreshToken: !isMonitor,
            },
            cookies: isMonitor ? {} : undefined,
        }
    )

    if (typeof window !== 'undefined') {
        window.__supabaseClient = client;
    }

    return client;
}
