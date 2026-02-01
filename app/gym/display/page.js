"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
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
    const [viewMode, setViewMode] = useState('loading');

    // Content Data
    const [tvSettings, setTvSettings] = useState({ enabled_features: ['live'], loop_duration_sec: 20 });
    const [contentData, setContentData] = useState({ news: [], events: [], challenges: [] });

    // Abort Controller Ref
    const fetchController = useRef(null);

    const [activeUsers, setActiveUsers] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]); // TODO: Fetch real leaderboard
    const [isLoading, setIsLoading] = useState(true);

    // Self-Healing & Connection State
    const [isConnected, setIsConnected] = useState(true);
    const lastHeartbeat = useRef(Date.now());

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

        // Content Polling (Fetch key settings & content every 30s)
        const fetchContent = async (signal) => {
            // 1. Fetch Settings
            const { data: settings } = await supabase.from('gym_tv_settings').select('*').match({ gym_id: gymId }).single().abortSignal(signal);
            if (settings) {
                setTvSettings(prev => settings);
                // Initialize View Mode if strictly needed
                if (viewMode === 'loading' && settings.enabled_features.length > 0) {
                    setViewMode(settings.enabled_features[0]);
                }
            } else if (viewMode === 'loading') {
                setViewMode('live');
            }

            // 2. Fetch Content
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data: news } = await supabase.from('gym_news').select('*').match({ gym_id: gymId, is_active: true }).order('created_at', { ascending: false }).abortSignal(signal);
            const { data: events } = await supabase.from('gym_events').select('*').eq('gym_id', gymId).gte('event_date', today.toISOString()).order('event_date', { ascending: true }).abortSignal(signal);
            const { data: challenges } = await supabase.from('gym_challenges').select('*').eq('gym_id', gymId).order('end_date', { ascending: true }).abortSignal(signal);

            setContentData({
                news: news || [],
                events: events || [],
                challenges: challenges || []
            });
        };

        const runFetch = async () => {
            if (fetchController.current) fetchController.current.abort();
            fetchController.current = new AbortController();
            try {
                await fetchContent(fetchController.current.signal);
            } catch (e) {
                if (e.name !== 'AbortError') console.error("Poll Error:", e);
            }
        };

        runFetch();
        const interval = setInterval(runFetch, 30000); // 30s Poll

        return () => {
            clearInterval(interval);
            if (fetchController.current) fetchController.current.abort();
        };

    }, [gymId]);

    // ... (keep Self-Healing useEffect)

    // Dynamic View Loop
    useEffect(() => {
        if (!isAuthenticated) return;
        const features = tvSettings.enabled_features || ['live'];
        if (features.length === 0) return;

        // Determine Duration for *Current* View
        const globalDuration = tvSettings.loop_duration_sec || 20;
        const specificDuration = tvSettings.feature_durations?.[viewMode];
        const duration = specificDuration || globalDuration;

        const loop = setTimeout(() => {
            setViewMode(current => {
                const currentIdx = features.indexOf(current);
                const nextIdx = (currentIdx + 1) % features.length;
                return features[nextIdx];
            });
        }, duration * 1000);

        return () => clearTimeout(loop);
    }, [isAuthenticated, tvSettings, viewMode]);

    // Data Polling (Robust Auto-Retry)
    useEffect(() => {
        if (!isAuthenticated || !gymId) return;

        let timeoutId;
        let isMounted = true;

        const fetchLive = async () => {
            if (!isMounted) return;

            const key = localStorage.getItem(`gym_key_${gymId}`);
            if (!key) return; // Should allow auth logic to handle this, but okay for here

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
                    setIsConnected(true);
                    lastHeartbeat.current = Date.now(); // Update Heartbeat on success
                } else {
                    console.warn(`Fetch error: ${res.status}`);
                }
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error("Poll Error - Retrying in 5s:", e);
                    // Connection might be flaky
                }
            } finally {
                if (isMounted) {
                    // Schedule next fetch regardless of success/fail (Auto-Retry)
                    timeoutId = setTimeout(fetchLive, POLL_INTERVAL);
                }
            }
        };

        fetchLive();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
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
                        key={viewMode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }} // Removed pulse for readability on mode switch
                        style={{ color: COLOR_ACCENT, fontSize: '1.5vw', fontWeight: 600, marginTop: '1vh', textTransform: 'uppercase' }}
                    >
                        • {viewMode === 'live' ? 'LIVE FLOOR' : viewMode}
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

                    {viewMode === 'news' && (
                        <motion.div
                            key="news"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.5 }}
                            style={{ height: '100%' }}
                        >
                            <NewsWall news={contentData.news} />
                        </motion.div>
                    )}

                    {viewMode === 'events' && (
                        <motion.div
                            key="events"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.5 }}
                            style={{ height: '100%' }}
                        >
                            <EventsWall events={contentData.events} />
                        </motion.div>
                    )}

                    {viewMode === 'challenges' && (
                        <motion.div
                            key="challenges"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 0.5 }}
                            style={{ height: '100%' }}
                        >
                            <ChallengesWall challenges={contentData.challenges} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* Connection Lost Overlay */}
            {!isConnected && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                    <h2 style={{ color: '#ff0000', fontSize: '3vw', marginBottom: '1vh' }}>CONNECTION LOST</h2>
                    <p style={{ color: '#fff', fontSize: '1.5vw' }}>Attempting to reconnect...</p>
                </div>
            )}
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

function NewsWall({ news }) {
    if (!news || news.length === 0) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2vw', color: '#666' }}>Checking for updates...</div>;

    const mainItem = news[0];
    const otherItems = news.slice(1, 4);

    return (
        <div style={{ height: '100%', padding: '2vw' }}>
            <h2 style={{ fontSize: '3vw', fontWeight: 900, marginBottom: '4vh', color: COLOR_ACCENT }}>NEWS & ANNOUNCEMENTS</h2>

            <div style={{ display: 'grid', gridTemplateColumns: otherItems.length > 0 ? '2fr 1fr' : '1fr', gap: '4vw', height: '80%' }}>
                {/* Main Feature */}
                <div style={{ background: COLOR_SURFACE, padding: '3vw', borderRadius: '2vw', border: '1px solid #333' }}>
                    <h3 style={{ fontSize: '2.5vw', fontWeight: 800, marginBottom: '2vh', color: '#fff' }}>{mainItem.title}</h3>
                    <p style={{ fontSize: '1.8vw', lineHeight: 1.5, color: '#ccc', whiteSpace: 'pre-wrap' }}>{mainItem.content}</p>
                </div>

                {/* Sidebar Items */}
                {otherItems.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                        {otherItems.map(item => (
                            <div key={item.id} style={{ background: '#0a0a0a', padding: '2vw', borderRadius: '1.5vw', border: '1px solid #222' }}>
                                <h4 style={{ fontSize: '1.5vw', fontWeight: 700, marginBottom: '1vh', color: '#fff' }}>{item.title}</h4>
                                <p style={{ fontSize: '1.2vw', color: '#888', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function EventsWall({ events }) {
    if (!events || events.length === 0) return <div />;

    return (
        <div style={{ height: '100%', padding: '2vw' }}>
            <h2 style={{ fontSize: '3vw', fontWeight: 900, marginBottom: '4vh', color: COLOR_ACCENT }}>UPCOMING EVENTS</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(25vw, 1fr))', gap: '3vw' }}>
                {events.map((event, i) => (
                    <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{ background: COLOR_SURFACE, padding: '3vw', borderRadius: '2vw', border: '1px solid #333', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}
                    >
                        <div style={{ fontSize: '5vw', marginBottom: '2vh' }}>📅</div>
                        <h3 style={{ fontSize: '2vw', fontWeight: 800, marginBottom: '1vh', color: '#fff' }}>{event.title}</h3>
                        <div style={{ fontSize: '1.5vw', color: COLOR_ACCENT, fontWeight: 700 }}>
                            {new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function ChallengesWall({ challenges }) {
    if (!challenges || challenges.length === 0) return <div />;

    return (
        <div style={{ height: '100%', padding: '2vw' }}>
            <h2 style={{ fontSize: '3vw', fontWeight: 900, marginBottom: '4vh', color: COLOR_ACCENT }}>ACTIVE CHALLENGES</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3vh', maxWidth: '80vw', margin: '0 auto' }}>
                {challenges.map((challenge, i) => (
                    <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{ background: COLOR_SURFACE, padding: '3vw', borderRadius: '2vw', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '2.5vw', fontWeight: 800, marginBottom: '1vh', color: '#fff' }}>{challenge.title}</h3>
                            <p style={{ fontSize: '1.8vw', color: '#aaa' }}>{challenge.description}</p>
                        </div>
                        <div style={{ background: '#222', padding: '1.5vw 3vw', borderRadius: '1vw', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2vw', color: '#666', textTransform: 'uppercase' }}>Goal</div>
                            <div style={{ fontSize: '2.5vw', fontWeight: 900, color: COLOR_ACCENT }}>FAIL</div>
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
