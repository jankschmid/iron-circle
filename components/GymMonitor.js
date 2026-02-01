"use client";

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';

// --- Singleton Monitor Client (Stateless) ---
const monitorSupabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false, // Important for monitor
            storage: {
                getItem: () => null,
                setItem: () => { },
                removeItem: () => { },
            }
        }
    }
);

// --- Constants ---
const POLL_INTERVAL = 5000; // 5s for Live Data
const POLL_CONTENT_INTERVAL = 30000; // 30s for Content/Settings
const COLOR_BG = '#050505';
const COLOR_ACCENT = '#faff00';
const COLOR_SURFACE = '#111';

export default function GymMonitor({ gymId, initialKey = null }) {
    const supabase = monitorSupabase;

    // State
    const [isAuthenticated, setIsAuthenticated] = useState(!!initialKey);
    const [gymInfo, setGymInfo] = useState(null);
    const [viewMode, setViewMode] = useState('loading');

    // Data State
    const [tvSettings, setTvSettings] = useState({ enabled_features: ['live'], loop_duration_sec: 20 });
    const [contentData, setContentData] = useState({ news: [], events: [], challenges: [], leaderboard: [] });
    const [activeUsers, setActiveUsers] = useState([]);

    // Recovery / Fallback State
    const [isOffline, setIsOffline] = useState(false);
    const fetchController = useRef(null);

    // Initial Load & Auth Verification
    useEffect(() => {
        if (!gymId) return;

        const loadInitial = async () => {
            // 1. Try Cache First (Stealth Startup)
            const cachedInfo = localStorage.getItem(`gym_info_${gymId}`);
            if (cachedInfo) setGymInfo(JSON.parse(cachedInfo));

            // 2. Fetch Fresh Gym Info
            const { data, error } = await supabase.from('gyms').select('name').eq('id', gymId).single();
            if (data) {
                setGymInfo(data);
                localStorage.setItem(`gym_info_${gymId}`, JSON.stringify(data));
            }

            // 3. Authenticate
            const key = initialKey || localStorage.getItem(`gym_key_${gymId}`);
            if (!key) {
                setIsAuthenticated(false);
                return;
            }
            setIsAuthenticated(true);
        };

        loadInitial();
    }, [gymId, initialKey]);

    // --- 1. Content & Settings Polling (30s) ---
    useEffect(() => {
        if (!gymId) return;

        const fetchContent = async (signal) => {
            try {
                // A. Settings
                const { data: settings } = await supabase.from('gym_tv_settings').select('*').match({ gym_id: gymId }).single().abortSignal(signal);
                if (settings) {
                    setTvSettings(settings);
                    // Cache configs? Maybe later.

                    // Initialize view if needed (and not offline)
                    if (viewMode === 'loading' && settings.enabled_features.length > 0) {
                        setViewMode(settings.enabled_features[0]);
                    }
                } else if (viewMode === 'loading') {
                    setViewMode('live');
                }

                // B. Content (News, Events, Challenges)
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const { data: news } = await supabase.from('gym_news').select('*').match({ gym_id: gymId, is_active: true }).order('created_at', { ascending: false }).abortSignal(signal);
                const { data: events } = await supabase.from('gym_events').select('*').eq('gym_id', gymId).gte('event_date', today.toISOString()).order('event_date', { ascending: true }).abortSignal(signal);
                const { data: challenges } = await supabase.from('gym_challenges').select('*').eq('gym_id', gymId).order('end_date', { ascending: true }).abortSignal(signal);

                // C. Leaderboard
                const { data: leaderboard } = await supabase.rpc('get_gym_leaderboard', {
                    p_gym_id: gymId,
                    p_period: 'month',
                    p_metric: 'volume',
                    p_limit: 5
                }).abortSignal(signal);

                setContentData({
                    news: news || [],
                    events: events || [],
                    challenges: challenges || [],
                    leaderboard: leaderboard || []
                });

                // If we were offline, we might be back? 
                // Mostly Live Fetch determines offline state, but this helps too.

            } catch (e) {
                if (e.name !== 'AbortError') console.warn("Content Poll Error (Silent):", e);
                // We don't trigger offline mode strictly on content failure, as long as Live works.
            }
        };

        const runFetch = async () => {
            if (fetchController.current) fetchController.current.abort();
            fetchController.current = new AbortController();
            try {
                await fetchContent(fetchController.current.signal);
            } catch (e) {
                // Ignore
            }
        };

        runFetch();
        const interval = setInterval(runFetch, POLL_CONTENT_INTERVAL);

        return () => {
            clearInterval(interval);
            if (fetchController.current) fetchController.current.abort();
        };
    }, [gymId, viewMode]);

    // --- 2. Live Activity Polling (5s - Silent Recovery) ---
    useEffect(() => {
        if (!isAuthenticated || !gymId) return;

        let timeoutId;
        let isMounted = true;
        let consecutiveFailures = 0;

        const fetchLive = async () => {
            if (!isMounted) return;
            const key = initialKey || localStorage.getItem(`gym_key_${gymId}`);
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

                    // Recovery: If we were offline, switch back
                    if (isOffline) {
                        setIsOffline(false);
                        // Pick a safe starting view or let dynamic rotator handle it
                        // We reset to 'loading' to let rotator pick best view
                        setViewMode(current => current === 'fallback' ? 'loading' : current);
                    }
                    consecutiveFailures = 0;
                } else {
                    throw new Error(`Status ${res.status}`);
                }
            } catch (e) {
                console.error("Live Poll Error (Silent):", e);
                consecutiveFailures++;

                // STEALTH SWITCH: If failing consistently (e.g. 2 times = 10s), switch to Fallback
                if (consecutiveFailures >= 2 && !isOffline) {
                    setIsOffline(true);
                    setViewMode('fallback');
                }
            } finally {
                if (isMounted) timeoutId = setTimeout(fetchLive, POLL_INTERVAL);
            }
        };

        fetchLive();
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [isAuthenticated, gymId, initialKey, isOffline]);


    // --- 3. Smart View Rotation ---
    useEffect(() => {
        if (!isAuthenticated || isOffline) return; // Don't rotate if offline

        // Dynamic Feature List based on AVAILABILITY
        const baseFeatures = tvSettings.enabled_features && tvSettings.enabled_features.length > 0
            ? tvSettings.enabled_features
            : ['live'];

        // Filter: Only show active content
        const activeFeatures = baseFeatures.filter(f => {
            if (f === 'live') return true;
            if (f === 'news') return contentData.news.length > 0;
            if (f === 'events') return contentData.events.length > 0;
            if (f === 'challenges') return contentData.challenges.length > 0;
            if (f === 'leaderboard') return true; // Leaderboard always 'active' even if mock data
            return true;
        });

        if (activeFeatures.length === 0) return;

        // Current Duration Lookup
        const globalDuration = tvSettings.loop_duration_sec || 20;
        let specificDuration = tvSettings.feature_durations?.[viewMode]; // e.g. { live: 60, news: 15 }

        // Override Duration logic if needed (e.g. empty live view)
        // If 'live' is empty, we can skip it OR show it briefly. 
        // Current decision: Show briefly if it's in the list.

        // View Rotation Logic
        let effectiveDuration = (specificDuration || globalDuration) * 1000;

        // Safety: ensure reasonable bounds
        if (effectiveDuration < 5000) effectiveDuration = 5000;

        const loop = setTimeout(() => {
            setViewMode(current => {
                // Check if current view is still valid in activeFeatures
                // If not, find first valid
                const idx = activeFeatures.indexOf(current);
                let nextIdx = 0;
                if (idx !== -1) {
                    nextIdx = (idx + 1) % activeFeatures.length;
                }
                return activeFeatures[nextIdx];
            });
        }, effectiveDuration);

        return () => clearTimeout(loop);

    }, [isAuthenticated, tvSettings, viewMode, activeUsers.length, contentData, isOffline]);


    if (!isAuthenticated) return <div style={{ background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Authentication Failed</div>;

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
                        animate={{ opacity: 1, y: 0 }}
                        style={{ color: COLOR_ACCENT, fontSize: '1.5vw', fontWeight: 600, marginTop: '1vh', textTransform: 'uppercase' }}
                    >
                        • {viewMode === 'live' ? 'LIVE FLOOR' : viewMode === 'fallback' ? 'OFFLINE' : viewMode}
                    </motion.div>
                </div>
                {/* Only show stats if ONLINE */}
                {!isOffline && (
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2vw', color: '#666' }}>Active Athletes</div>
                        <div style={{ fontSize: '3vw', fontWeight: 800, lineHeight: 1 }}>{activeUsers.length}</div>
                    </div>
                )}
            </header>

            {/* Content with Cross-Fade */}
            <div style={{ height: '82vh', position: 'relative' }}>
                <AnimatePresence mode="wait">
                    {viewMode === 'loading' && (
                        <motion.div key="loading" exit={{ opacity: 0 }} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Stealth Loading: Show nothing or subtle pulse */}
                        </motion.div>
                    )}

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

                    {viewMode === 'leaderboard' && (
                        <motion.div
                            key="leaderboard"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.5 }}
                            style={{ height: '100%' }}
                        >
                            <Leaderboard leaders={contentData.leaderboard} />
                        </motion.div>
                    )}

                    {/* Fallback View (Stealth Mode) */}
                    {viewMode === 'fallback' && (
                        <motion.div
                            key="fallback"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                            style={{ height: '100%' }}
                        >
                            <FallbackWall gymName={gymInfo?.name} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* NO VISIBLE OVERLAY FOR OFFLINE - STEALTH MODE ACTIVE */}
        </div>
    );
}

// --- Sub-Components ---

function FallbackWall({ gymName }) {
    // Configurable fields could be passed here later
    const title = "WELCOME TO IRON CIRCLE";
    const msg = gymName || "TRAIN HARD";

    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center'
        }}>
            {/* Animated Logo Placeholder or Icon */}
            <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    width: '15vw', height: '15vw', borderRadius: '50%', border: `4px solid ${COLOR_ACCENT}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '5vh', boxShadow: `0 0 50px ${COLOR_ACCENT}33`
                }}
            >
                <div style={{ fontSize: '8vw', fontWeight: 900, color: COLOR_ACCENT }}>IC</div>
            </motion.div>

            <h2 style={{ fontSize: '4vw', fontWeight: 900, marginBottom: '2vh', letterSpacing: '0.2vw' }}>
                {title}
            </h2>
            <p style={{ fontSize: '2vw', color: '#666', maxWidth: '60vw', lineHeight: 1.4 }}>
                {msg}
            </p>

            <div style={{ marginTop: '5vh', padding: '1vw 3vw', border: '1px solid #333', borderRadius: '50px', color: '#444' }}>
                Open App to Join
            </div>
        </div>
    );
}

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

function NewsWall({ news }) {
    if (!news || news.length === 0) return null;
    const mainItem = news[0];
    const otherItems = news.slice(1, 4);

    return (
        <div style={{ height: '100%', padding: '2vw' }}>
            <h2 style={{ fontSize: '3vw', fontWeight: 900, marginBottom: '4vh', color: COLOR_ACCENT }}>NEWS & ANNOUNCEMENTS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: otherItems.length > 0 ? '2fr 1fr' : '1fr', gap: '4vw', height: '80%' }}>
                <div style={{ background: COLOR_SURFACE, padding: '3vw', borderRadius: '2vw', border: '1px solid #333' }}>
                    <h3 style={{ fontSize: '2.5vw', fontWeight: 800, marginBottom: '2vh', color: '#fff' }}>{mainItem.title}</h3>
                    <p style={{ fontSize: '1.8vw', lineHeight: 1.5, color: '#ccc', whiteSpace: 'pre-wrap' }}>{mainItem.content}</p>
                </div>
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
    if (!events || events.length === 0) return null;
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
    if (!challenges || challenges.length === 0) return null;
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
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function Leaderboard({ leaders }) {
    if (!leaders || leaders.length === 0) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                <h2 style={{ fontSize: '3vw', fontWeight: 900, marginBottom: '2vh', color: COLOR_ACCENT }}>LEADERBOARD</h2>
                <div style={{ fontSize: '2vw' }}>Be the first to log a workout this month!</div>
            </div>
        );
    }

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
                            {(leader.value / 1000).toFixed(1)}k
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
