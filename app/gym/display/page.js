"use client";

import { useState, useEffect, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// --- Singleton Monitor Client (Stateless) ---
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

// --- Constants & Styles ---
const VIEW_DURATION_LIVE = 60000;
const VIEW_DURATION_LEADERBOARD = 20000;
const POLL_INTERVAL = 5000;

// Colors
const COLOR_BG = '#050505';
const COLOR_ACCENT = '#faff00';
const COLOR_SURFACE = '#111';

// --- Components ---

function GymMonitorPage() {
    const searchParams = useSearchParams();
    const gymId = searchParams.get('id');
    const supabase = monitorSupabase;

    // State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [displayKey, setDisplayKey] = useState('');
    const [gymInfo, setGymInfo] = useState(null);
    const [viewMode, setViewMode] = useState('live'); // 'live' | 'leaderboard'
    const [activeUsers, setActiveUsers] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        if (!gymId) return;

        // Check LocalStorage for Key
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

    // View Loop (60s Live <-> 20s Leaderboard)
    useEffect(() => {
        if (!isAuthenticated) return;

        const loop = setInterval(() => {
            setViewMode(prev => prev === 'live' ? 'leaderboard' : 'live');
        }, viewMode === 'live' ? VIEW_DURATION_LIVE : VIEW_DURATION_LEADERBOARD);

        return () => clearInterval(loop);
    }, [isAuthenticated, viewMode]);

    // Data Polling (Live Activity)
    useEffect(() => {
        if (!isAuthenticated || !gymId) return;

        const fetchLive = async () => {
            const key = localStorage.getItem(`gym_key_${gymId}`);
            if (!key) return;

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_live_gym_activity`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({ p_display_key: key, p_gym_id: gymId })
                });
                if (res.ok) {
                    const data = await res.json();
                    setActiveUsers(data || []);
                }
            } catch (e) {
                if (e.name !== 'AbortError') console.error("Poll Error:", e);
            }
        };

        fetchLive();
        const interval = setInterval(fetchLive, POLL_INTERVAL);

        // Also fetch Leaderboard initially
        // (Mocking leaderboard fetch for now or implement RPC if exists)
        // setLeaderboard([...mockData]); 

        return () => clearInterval(interval);
    }, [isAuthenticated, gymId]);


    const verifyKey = async (key) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/verify_gym_display_key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ p_gym_id: gymId, p_key: key })
            });

            if (res.ok && await res.json()) {
                setIsAuthenticated(true);
                localStorage.setItem(`gym_key_${gymId}`, key);
            } else {
                localStorage.removeItem(`gym_key_${gymId}`);
                setIsAuthenticated(false);
            }
        } catch (e) {
            console.error("Auth Failed", e);
            setIsAuthenticated(false);
        }
        setIsLoading(false);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        verifyKey(displayKey);
    };

    if (isLoading) return <div style={{ background: COLOR_BG, height: '100vh' }} />;

    if (!isAuthenticated) {
        return (
            <div style={{
                height: '100vh', width: '100vw', background: COLOR_BG, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif'
            }}>
                <form onSubmit={handleLogin} style={{ textAlign: 'center', width: '300px' }}>
                    <h1 style={{ marginBottom: '20px', fontWeight: 900 }}>IRON MONITOR</h1>
                    <p style={{ color: '#888', marginBottom: '20px' }}>{gymInfo?.name}</p>
                    <input
                        type="password"
                        value={displayKey}
                        onChange={(e) => setDisplayKey(e.target.value)}
                        placeholder="ENTER KEY"
                        style={{
                            width: '100%', padding: '15px', background: COLOR_SURFACE,
                            border: '1px solid #333', color: '#fff', textAlign: 'center',
                            fontSize: '1.2rem', marginBottom: '15px', borderRadius: '8px'
                        }}
                    />
                    <button type="submit" style={{
                        width: '100%', padding: '15px', background: '#fff',
                        border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '8px'
                    }}>UNLOCK</button>
                </form>
            </div>
        );
    }

    return (
        <div style={{
            height: '100vh', width: '100vw', background: COLOR_BG,
            color: '#fff', fontFamily: 'Inter, sans-serif', overflow: 'hidden',
            padding: '3vh 3vw'
        }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '10vh', marginBottom: '2vh' }}>
                <div>
                    <h1 style={{ fontSize: '4vw', fontWeight: 900, margin: 0, lineHeight: 0.9 }}>
                        {gymInfo?.name?.toUpperCase()}
                    </h1>
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ color: COLOR_ACCENT, fontSize: '1.5vw', fontWeight: 600, marginTop: '1vh' }}
                    >
                        • LIVE FLOOR
                    </motion.div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2vw', color: '#666' }}>Active Athletes</div>
                    <div style={{ fontSize: '3vw', fontWeight: 800, lineHeight: 1 }}>{activeUsers.length}</div>
                </div>
            </header>

            {/* Content Area with Cross-Fade */}
            <div style={{ height: '82vh', position: 'relative' }}>
                <AnimatePresence mode="wait">
                    {viewMode === 'live' && (
                        <motion.div
                            key="live"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.5 }}
                            style={{ height: '100%' }}
                        >
                            <LiveWall users={activeUsers} />
                        </motion.div>
                    )}

                    {viewMode === 'leaderboard' && (
                        <motion.div
                            key="leaderboard"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.5 }}
                            style={{ height: '100%' }}
                        >
                            <Leaderboard />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// --- Sub-Components ---

function LiveWall({ users }) {
    if (users.length === 0) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                <h2 style={{ fontSize: '3vw', fontWeight: 800 }}>THE FLOOR IS QUIET</h2>
                <p style={{ fontSize: '1.5vw' }}>Start a workout to join the board.</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(20vw, 1fr))',
            gridAutoRows: 'min-content',
            gap: '2vw'
        }}>
            <AnimatePresence>
                {users.map((user) => (
                    <LiveCard key={user.user_id} user={user} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function LiveCard({ user }) {
    const isRecent = true; // Todo: Check timestamp < 2min

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
                background: COLOR_SURFACE,
                borderRadius: '1vw',
                padding: '1.5vw',
                border: '1px solid #222',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5vw',
                boxShadow: '0 0.5vw 2vw rgba(0,0,0,0.5)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Heartbeat Indicator */}
            {isRecent && (
                <motion.div
                    animate={{ boxShadow: [`0 0 0px ${COLOR_ACCENT}00`, `0 0 20px ${COLOR_ACCENT}66`, `0 0 0px ${COLOR_ACCENT}00`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                        position: 'absolute', top: '1vw', right: '1vw',
                        width: '0.8vw', height: '0.8vw', borderRadius: '50%',
                        background: '#0f0'
                    }}
                />
            )}

            <div style={{ flexShrink: 0 }}>
                {user.avatar_url ? (
                    <img src={user.avatar_url} style={{ width: '5vw', height: '5vw', borderRadius: '50%', objectFit: 'cover', border: '2px solid #333' }} />
                ) : (
                    <div style={{ width: '5vw', height: '5vw', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2vw', fontWeight: 'bold' }}>
                        {user.username?.[0]?.toUpperCase()}
                    </div>
                )}
            </div>

            <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: '1.8vw', fontWeight: 800, margin: '0 0 0.5vw 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.username}
                </h3>
                <div style={{ color: '#888', fontSize: '1.2vw', fontWeight: 500 }}>
                    {user.current_exercise || 'Resting'}
                </div>
                {user.current_set && (
                    <div style={{
                        display: 'inline-block', marginTop: '0.5vw',
                        background: '#222', color: '#fff', padding: '0.2vw 0.8vw',
                        borderRadius: '100vw', fontSize: '0.9vw', fontWeight: 700
                    }}>
                        SET {user.current_set}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function Leaderboard() {
    // Mock Data for now until RPC is ready
    const leaders = [
        { id: 1, name: 'Jan S.', value: '42,500 kg', rank: 1 },
        { id: 2, name: 'Mike T.', value: '38,200 kg', rank: 2 },
        { id: 3, name: 'Sarah L.', value: '31,000 kg', rank: 3 },
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '3vw', fontWeight: 900, marginBottom: '4vh', color: COLOR_ACCENT }}>
                MONTHLY LEADERS • VOLUME
            </h2>
            <div style={{ width: '60vw', display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                {leaders.map((leader, i) => (
                    <motion.div
                        key={leader.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{
                            background: leader.rank === 1 ? `linear-gradient(90deg, ${COLOR_ACCENT}22, ${COLOR_SURFACE})` : COLOR_SURFACE,
                            border: `1px solid ${leader.rank === 1 ? COLOR_ACCENT : '#333'}`,
                            padding: '2vh 3vw', borderRadius: '1vw',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            transform: leader.rank === 1 ? 'scale(1.05)' : 'scale(1)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2vw' }}>
                            <div style={{
                                fontSize: '2.5vw', fontWeight: 900, color: leader.rank === 1 ? COLOR_ACCENT : '#666',
                                width: '3vw', textAlign: 'center'
                            }}>
                                #{leader.rank}
                            </div>
                            <div style={{ fontSize: '2vw', fontWeight: 700 }}>{leader.name}</div>
                        </div>
                        <div style={{ fontSize: '2vw', fontWeight: 900, color: '#fff' }}>
                            {leader.value}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export default function GymMonitorPageWrapper() {
    return (
        <Suspense fallback={<div style={{ background: COLOR_BG, height: '100vh' }}></div>}>
            <GymMonitorPage />
        </Suspense>
    );
}
