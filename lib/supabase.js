import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const isMonitor = typeof window !== 'undefined' && (
        window.location.pathname.includes('/gym/display') ||
        window.location.pathname.includes('/tv')
    );

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                // WENN Monitor: Speichere Session NICHT im Browser (nur im RAM).
                // WENN Dashboard: Speichere ganz normal.
                persistSession: !isMonitor,

                // Zusätzlich: Keine URL-Checks beim Monitor
                detectSessionInUrl: !isMonitor,

                // Sicherstellen, dass keine Auto-Refresh-Tokens im LocalStorage gesucht werden
                autoRefreshToken: !isMonitor,
            },
            // Nur zur Sicherheit: Wenn wir im Monitor sind, nutzen wir Cookies gar nicht
            cookies: isMonitor ? {} : undefined,
        }
    )
}
