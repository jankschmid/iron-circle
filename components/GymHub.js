"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import GymChat from './GymChat';

export default function GymHub({ communityId, gymId, initialView = 'lobby' }) {
    const supabase = createClient();
    const { user } = useStore();
    const [activeTab, setActiveTab] = useState(initialView);

    // Data State
    const [gym, setGym] = useState(null);
    const [liveUsers, setLiveUsers] = useState([]);
    const [news, setNews] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch All Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Gym Details
                const { data: gymData } = await supabase.from('gyms').select('*').eq('id', gymId).single();
                setGym(gymData);

                // 2. Live Users (using RPC or direct query)
                // Use the new fix we just made!
                const { data: active } = await supabase.rpc('get_live_gym_activity', {
                    p_display_key: 'internal', // We might need a key or different RPC for client-side? 
                    // Actually, RPC checks key. We don't have a specific key here. 
                    // The user session auth should be enough if we modify RPC or use direct query.
                    // Direct query is better for authenticated users.
                    p_gym_id: gymId
                }).catch(() => ({ data: [] })); // Fallback if RPC fails due to key

                // If RPC fails (requires key), let's use direct query
                if (!active || active.error) {
                    const { data: directActive } = await supabase
                        .from('workout_sessions')
                        .select('user_id, profiles(username, avatar_url, current_exercise)')
                        .eq('gym_id', gymId)
                        .eq('status', 'active')
                        .gt('start_time', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString());

                    const formatted = directActive?.map(s => ({
                        user_id: s.user_id,
                        username: s.profiles.username,
                        avatar_url: s.profiles.avatar_url,
                        current_exercise: s.profiles.current_exercise
                    })) || [];
                    setLiveUsers(formatted);
                } else {
                    setLiveUsers(active);
                }

                // 3. News
                const { data: newsData } = await supabase.from('gym_news').select('*').eq('gym_id', gymId).eq('is_active', true).order('created_at', { ascending: false });
                setNews(newsData || []);

                // 4. Events
                const { data: eventsData } = await supabase.from('gym_events').select('*').eq('gym_id', gymId).gte('event_date', new Date().toISOString()).order('event_date', { ascending: true });
                setEvents(eventsData || []);

            } catch (err) {
                console.error("GymHub Load Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Poll for Live Users every 30s
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [gymId]);

    if (loading) return <div style={{ background: '#000', height: '100vh' }}></div>;

    return (
        <div style={{ background: '#050505', minHeight: '100vh', color: '#fff', paddingBottom: '80px' }}>
            {/* 1. HERO SECTION */}
            <div style={{ position: 'relative', height: '25vh', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: gym?.cover_image ? `url(${gym.cover_image}) center/cover` : 'linear-gradient(45deg, #111, #222)',
                    opacity: 0.6
                }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, #050505)' }} />

                <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {gym?.logo_url ? <img src={gym.logo_url} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #fff' }} /> : <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#333' }} />}
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase' }}>{gym?.name}</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ background: '#faff00', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>VERIFIED PARTNER</span>
                                <span style={{ fontSize: '0.8rem', color: '#ccc' }}>• {gym?.city || 'Iron Circle'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. LIVE BAR (Stories) */}
            <div style={{ padding: '20px 0 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff00', boxShadow: '0 0 10px #00ff00' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>{liveUsers.length} Athletes training now</span>
                </div>

                <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingRight: '20px', scrollbarWidth: 'none' }}>
                    {liveUsers.map(u => (
                        <div key={u.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '64px' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #faff00', padding: '2px',
                                position: 'relative'
                            }}>
                                <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`}
                                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#333' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', marginTop: '6px', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {u.username}
                            </span>
                        </div>
                    ))}
                    {liveUsers.length === 0 && (
                        <div style={{ color: '#666', fontSize: '0.9rem', fontStyle: 'italic' }}>The floor is quiet...</div>
                    )}
                </div>
            </div>

            {/* 3. TABS */}
            <div style={{ display: 'flex', borderBottom: '1px solid #222', padding: '0 20px' }}>
                {['lobby', 'leaderboard', 'events'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1, padding: '16px', background: 'transparent', border: 'none',
                            color: activeTab === tab ? '#faff00' : '#888',
                            fontWeight: activeTab === tab ? '900' : '600',
                            borderBottom: activeTab === tab ? '2px solid #faff00' : '2px solid transparent',
                            textTransform: 'uppercase', cursor: 'pointer'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* 4. CONTENT AREA */}
            <div style={{ padding: '20px' }}>
                <AnimatePresence mode="wait">
                    {activeTab === 'lobby' && (
                        <motion.div
                            key="lobby"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <GymChat communityId={communityId} news={news} />
                        </motion.div>
                    )}

                    {activeTab === 'leaderboard' && (
                        <motion.div
                            key="leaderboard"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <GymLeaderboard gymId={gymId} />
                        </motion.div>
                    )}

                    {activeTab === 'events' && (
                        <motion.div
                            key="events"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <GymEvents events={events} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// --- SUB COMPONENTS ---

function GymLeaderboard({ gymId }) {
    // Mock for now, similar to Monitor
    const leaders = [
        { id: 1, name: 'Jan S.', value: '42,500 kg', rank: 1, avatar: null },
        { id: 2, name: 'Mike T.', value: '38,200 kg', rank: 2, avatar: null },
        { id: 3, name: 'Sarah L.', value: '31,000 kg', rank: 3, avatar: null },
        { id: 4, name: 'Tom H.', value: '28,000 kg', rank: 4, avatar: null },
        { id: 5, name: 'Lisa M.', value: '25,500 kg', rank: 5, avatar: null },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>This Month</h2>
                <select style={{ background: '#222', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px' }}>
                    <option>Volume</option>
                    <option>Visits</option>
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {leaders.map(l => (
                    <div key={l.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px', background: '#111', borderRadius: '12px',
                        border: l.rank === 1 ? '1px solid #faff00' : '1px solid #222'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '24px', textAlign: 'center', fontWeight: 'bold', color: l.rank <= 3 ? '#faff00' : '#666' }}>#{l.rank}</div>
                            <div style={{ width: '32px', height: '32px', background: '#333', borderRadius: '50%' }} />
                            <span style={{ fontWeight: 600 }}>{l.name}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: '#ccc' }}>{l.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function GymEvents({ events }) {
    if (events.length === 0) return <div style={{ color: '#666', textAlign: 'center', padding: '40px' }}>No upcoming events.</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {events.map(e => (
                <div key={e.id} style={{ background: '#111', borderRadius: '16px', overflow: 'hidden', border: '1px solid #222' }}>
                    {e.image_url && <div style={{ height: '120px', background: `url(${e.image_url}) center/cover` }} />}
                    <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#faff00', fontWeight: 'bold', marginBottom: '4px' }}>
                            {new Date(e.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>{e.title}</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.5 }}>{e.description}</p>
                        <button style={{
                            width: '100%', padding: '12px', marginTop: '16px',
                            background: '#faff00', color: '#000', border: 'none',
                            borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                        }}>
                            Count me in
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
