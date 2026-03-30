'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EnvDebugPage() {
    const [envStatus, setEnvStatus] = useState({});

    useEffect(() => {
        setEnvStatus({
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
                ? 'Present (Starts with ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 5) + '...)' 
                : 'Missing',
            Capacitor_Platform: typeof window !== 'undefined' && window.Capacitor ? window.Capacitor.getPlatform() : 'Web/Not Detected',
            User_Agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
        });
    }, []);

    return (
        <div style={{ padding: '40px 20px', background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'monospace' }}>
            <Link href="/profile" style={{ color: 'var(--primary)', textDecoration: 'none', marginBottom: '20px', display: 'block' }}>← Back to Profile</Link>
            <h1 style={{ color: 'var(--primary)', marginBottom: '24px' }}>System Debug</h1>
            <div style={{ background: '#111', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(envStatus, null, 2)}</pre>
            </div>
            
            <div style={{ marginTop: '32px', color: '#888', fontSize: '0.9rem' }}>
                <p><strong>Note:</strong> If "Missing", check Codemagic environment variable groups and build settings.</p>
                <p style={{ marginTop: '12px' }}>This app was built with <code>output: export</code>, meaning variables are baked in at build-time.</p>
            </div>
            
            <button 
                onClick={() => window.location.reload()}
                style={{ marginTop: '32px', padding: '12px 24px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
                Reload App
            </button>
        </div>
    );
}
