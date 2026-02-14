'use client';

import { useState, useEffect } from 'react';

export default function EnvDebugPage() {
    const [envStatus, setEnvStatus] = useState({});

    useEffect(() => {
        setEnvStatus({
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present (Starts with ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 5) + '...)' : 'Missing',
            NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ? 'Present (Starts with ' + process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY.substring(0, 5) + '...)' : 'Missing',
        });
    }, []);

    return (
        <div style={{ padding: '20px', background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'monospace' }}>
            <h1>Environment Debug</h1>
            <pre>{JSON.stringify(envStatus, null, 2)}</pre>
            <p style={{ marginTop: '20px', color: '#888' }}>
                Note: This page is for debugging build issues.
            </p>
        </div>
    );
}
