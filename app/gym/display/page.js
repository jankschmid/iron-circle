"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr'; // Direct import
import { useSearchParams } from 'next/navigation';

const monitorSupabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: { // Fix: Disable locking/storage completely
                getItem: () => null,
                setItem: () => { },
                removeItem: () => { },
            }
        }
    }
);

const GymMonitorPageContent = GymMonitorPage; // Rename original component

export default function GymMonitorPageWrapper() {
    return (
        <Suspense fallback={<div style={{ background: '#000', height: '100vh' }}></div>}>
            <GymMonitorPageContent />
        </Suspense>
    );
}

function GymMonitorPage() {
    const searchParams = useSearchParams();
    const gymId = searchParams.get('id');

    // Use singleton client
    const supabase = monitorSupabase;
    // ... rest of component ...


    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [displayKey, setDisplayKey] = useState('');
    const [authError, setAuthError] = useState('');

    // Data State
    const [activeUsers, setActiveUsers] = useState([]);
    const [gymInfo, setGymInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load key from localStorage on mount
    useEffect(() => {
        if (!gymId) return;

        const storedKey = localStorage.getItem(`gym_key_${gymId}`);
        if (storedKey) {
            verifyKey(storedKey);
        } else {
            setIsLoading(false);
        }

        // Fetch Gym Info
        supabase.from('gyms').select('name').eq('id', gymId).single()
            .then(({ data }) => setGymInfo(data));

    }, [gymId]);

    // Polling Logic
    useEffect(() => {
        if (!isAuthenticated || !gymId) return;

        const fetchLiveActivity = async () => {
            // Get key from storage (since state might not represent verified key)
            const key = localStorage.getItem(`gym_key_${gymId}`);
            if (!key) return; // Should catch this sooner, but safety first

            // Use Raw Fetch for Polling to avoid AbortErrors
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
                    // Start fresh: ignore aborts on page unload, but log real errors
                    if (response.status !== 0 && response.status !== 200) {
                        const text = await response.text();
                        console.error("Monitor Poll Fetch Error:", response.status, text);
                    }
                    return;
                }

                const data = await response.json();
                setActiveUsers(data || []);
            } catch (err) {
                // Ignore AbortError from fetch itself if page is unloading
                if (err.name !== 'AbortError') {
                    console.error("Monitor Poll Network Error:", err);
                }
            }
        };

        fetchLiveActivity();
        const interval = setInterval(fetchLiveActivity, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [isAuthenticated, gymId]);

    const verifyKey = async (key) => {
        // In a real app, verify against DB (hash) or just store locally if we trust the person who entered it.
        // For security, we should check:
        // Use Raw Fetch to bypass Supabase Client AbortController issues
        console.log("[DEBUG] Verifying Key (Raw Fetch):", { p_gym_id: gymId, p_key: key });

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/verify_gym_display_key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ p_gym_id: gymId, p_key: key })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Fetch Failed: ${response.status} - ${text}`);
            }

            const isValid = await response.json();

            if (isValid) {
                setIsAuthenticated(true);
                localStorage.setItem(`gym_key_${gymId}`, key);
                setAuthError('');
            } else {
                console.warn("Invalid Key Attempt:", key);
                setAuthError('Invalid Display Key (Check Admin Dashboard)');
                localStorage.removeItem(`gym_key_${gymId}`);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error("Raw Verification Error:", error);
            setAuthError('Verification Error: ' + error.message);
            setIsAuthenticated(false);
        }

        setIsLoading(false);
        return; // Early return to skip old logic

        /* 
        // OLD LOGIC (Commented out)
        const { data: isValid, error } = await supabase.rpc('verify_gym_display_key', {
            p_gym_id: gymId,
            p_key: key
        });
        */
    };

    const handleLogin = async (e) => {
        e.preventDefault(); // Critical: Prevent page reload
        await verifyKey(displayKey);
    };

    if (!gymId) return <div style={{ background: '#000', height: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Gym ID missing</div>;
    if (isLoading) return <div style={{ background: '#000', height: '100vh' }}></div>;

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
                    <p style={{ color: 'var(--primary, #FFC800)', fontSize: '1.5rem', margin: 0 }}>LIVE FLOOR</p>
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
    // Determine status color/state based on Recency?
    // Using inline styles for simplicity/portability
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
            {/* "Live" Indicator */}
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
