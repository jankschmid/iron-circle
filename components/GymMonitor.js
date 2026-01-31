"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// Singleton Monitor Client
const monitorSupabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: {
                getItem: () => null,
                setItem: () => { },
                removeItem: () => { },
            }
        }
    }
);

export default function GymMonitor({ gymId, initialKey = null }) {
    const supabase = monitorSupabase;

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(!!initialKey);
    const [displayKey, setDisplayKey] = useState('');
    const [authError, setAuthError] = useState('');

    // Data State
    const [activeUsers, setActiveUsers] = useState([]);
    const [gymInfo, setGymInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        if (!gymId) return;

        // Fetch Gym Info
        supabase.from('gyms').select('name').eq('id', gymId).single()
            .then(({ data }) => setGymInfo(data));

        // If key provided (e.g. from TV pairing), verify immediately
        if (initialKey) {
            verifyKey(initialKey);
        } else {
            // Check LocalStorage
            const storedKey = localStorage.getItem(`gym_key_${gymId}`);
            if (storedKey) {
                verifyKey(storedKey);
            } else {
                setIsLoading(false);
            }
        }
    }, [gymId, initialKey]);

    // Polling Logic
    useEffect(() => {
        if (!isAuthenticated || !gymId) return;

        const fetchLiveActivity = async () => {
            const key = initialKey || localStorage.getItem(`gym_key_${gymId}`);
            if (!key) return;

            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_live_gym_activity`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({ p_display_key: key, p_gym_id: gymId })
                });

                if (!response.ok) {
                    if (response.status !== 0 && response.status !== 200) {
                        const text = await response.text();
                        console.error("Monitor Poll Fetch Error:", response.status, text);
                    }
                    return;
                }

                const data = await response.json();
                setActiveUsers(data || []);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error("Monitor Poll Network Error:", err);
                }
            }
        };

        fetchLiveActivity();
        const interval = setInterval(fetchLiveActivity, 10000);
        return () => clearInterval(interval);
    }, [isAuthenticated, gymId, initialKey]);

    const verifyKey = async (key) => {
        try {
            // Skip verification for TV paired devices (trusted via initialKey logic) if we assume pairing implies access.
            // But get_live_gym_activity REQUIRES a valid key.
            // For TV pairing, we don't have the display_key, we have a pairing session.
            // FIXME: RPC get_live_gym_activity needs display_key.
            // If the TV is paired, does it have the key? NO.
            // The pairing RPC should probably RETURN the display_key?
            // Or we need a separate RPC for monitors.

            // Current workaround: If initialKey is passed (it's actually the gymId for TV?), wait.
            // TV Page assumes it has access. But RLS might block it.

            // Let's assume for now the TV flow worked before because it redirected to display?id=...
            // But without the key, display page shows login. 
            // So how did it work for the user?
            // "TV wird angezeigt" -> User must have seeing the login or the floor?
            // If they saw the floor, they must have had a key in localStorage?

            // Let's proceed with standard flow.

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/verify_gym_display_key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ p_gym_id: gymId, p_key: key })
            });

            if (!response.ok) throw new Error("Verification Failed");

            const isValid = await response.json();

            if (isValid) {
                setIsAuthenticated(true);
                if (!initialKey) localStorage.setItem(`gym_key_${gymId}`, key);
                setAuthError('');
            } else {
                setAuthError('Invalid Display Key');
                localStorage.removeItem(`gym_key_${gymId}`);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error("Verification Error:", error);
            setAuthError('Verification Error');
            setIsAuthenticated(false);
        }
        setIsLoading(false);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        await verifyKey(displayKey);
    };

    if (isLoading) return <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Loading...</div>;

    if (!isAuthenticated) {
        return (
            <div style={{
                height: '100vh', width: '100vw', background: '#000', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif'
            }}>
                <form onSubmit={handleLogin} style={{ textAlign: 'center', maxWidth: '300px', width: '100%' }}>
                    <h1 style={{ marginBottom: '24px' }}>IronCircle Monitor</h1>
                    <p style={{ color: '#888', marginBottom: '24px' }}>{gymInfo?.name || 'Enter Display Key'}</p>
                    <input
                        type="password"
                        placeholder="Display Key (6-digit)"
                        value={displayKey}
                        onChange={(e) => setDisplayKey(e.target.value)}
                        style={{
                            width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #333',
                            background: '#111', color: '#fff', fontSize: '1.2rem', textAlign: 'center', marginBottom: '16px'
                        }}
                    />
                    {authError && <p style={{ color: 'red', marginBottom: '16px' }}>{authError}</p>}
                    <button type="submit" style={{
                        width: '100%', padding: '16px', borderRadius: '8px', border: 'none',
                        background: '#fff', color: '#000', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer'
                    }}>
                        Unlock Display
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div style={{
            height: '100vh', width: '100vw', background: '#000', color: '#fff',
            fontFamily: 'Inter, sans-serif', overflow: 'hidden', padding: '40px'
        }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '3rem', fontWeight: '900', margin: 0, lineHeight: 1 }}>{gymInfo?.name?.toUpperCase()}</h1>
                    <p style={{ color: '#FFC800', fontSize: '1.5rem', margin: 0 }}>LIVE FLOOR</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', color: '#666' }}>Active Athletes</div>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{activeUsers.length}</div>
                </div>
            </header>

            {/* Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px'
            }}>
                {activeUsers.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', color: '#333' }}>
                        <h2>The floor is quiet...</h2>
                        <p>Join a workout to see yourself here!</p>
                    </div>
                ) : (
                    activeUsers.map(user => (
                        <MonitorCard key={user.user_id} user={user} />
                    ))
                )}
            </div>
        </div>
    );
}

function MonitorCard({ user }) {
    return (
        <div style={{
            background: '#111',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #222',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute', top: '16px', right: '16px',
                width: '12px', height: '12px', borderRadius: '50%',
                background: '#0f0', boxShadow: '0 0 10px #0f0'
            }} />

            <div style={{ flexShrink: 0 }}>
                {user.avatar_url ? (
                    <img src={user.avatar_url} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #333' }} />
                ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                        {user.username?.[0]?.toUpperCase()}
                    </div>
                )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.username}
                </h3>
                <div style={{ color: '#aaa', fontSize: '1.1rem', marginBottom: '8px' }}>
                    {user.current_exercise || 'Resting'}
                </div>
                {user.current_set && (
                    <div style={{
                        display: 'inline-block',
                        background: '#222',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '100px',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                    }}>
                        Set {user.current_set}
                    </div>
                )}
            </div>
        </div>
    );
}
