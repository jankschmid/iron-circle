import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
    const isMonitor = typeof window !== 'undefined' && (
        window.location.pathname.includes('/gym/display') ||
        window.location.pathname.includes('/tv')
    );

    // Singleton — one client per window
    if (typeof window !== 'undefined') {
        if (window.__supabaseClient) return window.__supabaseClient;
    }

    const client = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                // Use localStorage (not cookies) — required for Capacitor iOS WKWebView
                // @supabase/ssr's createBrowserClient uses cookies which are not reliably
                // passed in WKWebView requests, causing authenticated RLS queries to fail silently
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                persistSession: !isMonitor,
                detectSessionInUrl: !isMonitor,
                autoRefreshToken: !isMonitor,
            },
        }
    )

    if (typeof window !== 'undefined') {
        window.__supabaseClient = client;
    }

    return client;
}
