"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import GymChat from './GymChat';
import GymAdminModal from './GymAdminModal';

export default function GymHub({ communityId, gymId, initialView = 'lobby' }) {
    const supabase = createClient();
    const { user } = useStore();
    const [activeTab, setActiveTab] = useState(initialView);

    // Data State
    const [gym, setGym] = useState(null);
    const [liveUsers, setLiveUsers] = useState([]);
    const [news, setNews] = useState([]);
    const [events, setEvents] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]); // Real Data
    const [loading, setLoading] = useState(true);

    // Admin State
    const [showAdmin, setShowAdmin] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Fetch All Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Gym Details
                const { data: gymData } = await supabase.from('gyms').select('*').eq('id', gymId).single();
                setGym(gymData);

                // 2. Live Users (Direct Query with fallback)
                let activeUsers = [];
                const { data: active } = await supabase.rpc('get_live_gym_activity', {
                    p_gym_id: gymId
                }).catch(() => ({ data: null }));

                if (active && !active.error) {
                    activeUsers = active;
                } else {
                    const { data: directActive } = await supabase
                        .from('workout_sessions')
                        .select('user_id, profiles(username, avatar_url, current_exercise)')
                        .eq('gym_id', gymId)
                        .eq('status', 'active')
                        .gt('start_time', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString());

                    activeUsers = directActive?.map(s => ({
                        user_id: s.user_id,
                        username: s.profiles.username,
                        avatar_url: s.profiles.avatar_url,
                        current_exercise: s.profiles.current_exercise
                    })) || [];
                }
                setLiveUsers(activeUsers);

                // 3. News
                const { data: newsData } = await supabase.from('gym_news').select('*').eq('gym_id', gymId).eq('is_active', true).order('created_at', { ascending: false });
                setNews(newsData || []);

                // 4. Events
                const { data: eventsData } = await supabase.from('gym_events').select('*').eq('gym_id', gymId).gte('event_date', new Date().toISOString()).order('event_date', { ascending: true });
                setEvents(eventsData || []);

                // 4b. Challenges
                const { data: challengesData } = await supabase.from('gym_challenges').select('*').eq('gym_id', gymId).eq('is_active', true);
                setChallenges(challengesData || []);

                // 5. Leaderboard (Real)
                const { data: lbData } = await supabase.rpc('get_gym_leaderboard', {
                    p_gym_id: gymId,
                    p_period: 'month',
                    p_metric: 'volume',
                    p_limit: 10
                });
                setLeaderboard(lbData || []);

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
    }, [gymId, refreshTrigger]);

    if (loading) return <div style={{ background: 'var(--background)', height: '100vh' }}></div>;

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', color: 'var(--foreground)', paddingBottom: '80px' }}>
            {/* 1. HERO SECTION */}
            <div style={{ position: 'relative', height: '25vh', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: gym?.cover_image ? `url(${gym.cover_image}) center/cover` : 'var(--surface)',
                    opacity: 0.6
                }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, var(--background))' }} />

                <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {gym?.logo_url ? <img src={gym.logo_url} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid var(--foreground)' }} /> : <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--surface-highlight)' }} />}
                            <div>
                                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase' }}>{gym?.name}</h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ background: 'var(--primary)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>VERIFIED PARTNER</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• {gym?.city || 'Iron Circle'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Admin Button */}
                        <button
                            onClick={() => setShowAdmin(true)}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)',
                                padding: '8px',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            ⚙️
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. LIVE BAR (Stories) */}
            <div style={{ padding: '20px 0 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--foreground)' }}>{liveUsers.length} Athletes training now</span>
                </div>

                <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingRight: '20px', scrollbarWidth: 'none' }}>
                    {liveUsers.map(u => (
                        <div key={u.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '64px' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--primary)', padding: '2px',
                                position: 'relative'
                            }}>
                                <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`}
                                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: 'var(--surface)' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', marginTop: '6px', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                {u.username}
                            </span>
                        </div>
                    ))}
                    {liveUsers.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>The floor is quiet...</div>
                    )}
                </div>
            </div>

            {/* 3. TABS */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
                {['lobby', 'leaderboard', 'events', 'challenges'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1, padding: '16px', background: 'transparent', border: 'none',
                            color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === tab ? '900' : '600',
                            borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
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
                            <GymLeaderboard leaders={leaderboard} />
                        </motion.div>
                    )}

                    {activeTab === 'events' && (
                        <motion.div
                            key="events"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <GymEvents events={events} onAdd={() => setShowAdmin(true)} />
                        </motion.div>
                    )}

                    {activeTab === 'challenges' && (
                        <motion.div
                            key="challenges"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <GymChallenges challenges={challenges} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Admin Modal */}
            {showAdmin && (
                <GymAdminModal
                    gymId={gymId}
                    onClose={() => {
                        setShowAdmin(false);
                        setRefreshTrigger(prev => prev + 1); // Trigger Refresh
                    }}
                />
            )}
        </div>
    );
}

// --- SUB COMPONENTS ---

function GymLeaderboard({ leaders }) {
    if (!leaders || leaders.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No rankings yet. Start logging workouts!
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>This Month</h2>
                <select style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px' }}>
                    <option>Volume</option>
                    {/* <option>Visits</option> - Not implemented in UI logic yet */}
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {leaders.map(l => (
                    <div key={l.user_id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px', background: 'var(--surface)', borderRadius: '12px',
                        border: l.rank === 1 ? '1px solid var(--primary)' : '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '24px', textAlign: 'center', fontWeight: 'bold', color: l.rank <= 3 ? 'var(--primary)' : 'var(--text-muted)' }}>#{l.rank}</div>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-highlight)' }}>
                                {l.avatar_url ? <img src={l.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                            </div>
                            <span style={{ fontWeight: 600 }}>{l.username}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>
                            {(l.value / 1000).toFixed(1)}k
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function GymEvents({ events, onAdd }) {
    const { user, joinEvent, leaveEvent } = useStore();
    const supabase = createClient();
    const [myRsvps, setMyRsvps] = useState({});

    // Fetch My RSVPs logic would ideally be in parent, but localized here for now
    useEffect(() => {
        if (!user) return;
        const fetchRsvps = async () => {
            const { data } = await supabase.from('event_participants').select('event_id, status').eq('user_id', user.id);
            if (data) {
                const map = {};
                data.forEach(r => map[r.event_id] = r.status);
                setMyRsvps(map);
            }
        };
        fetchRsvps();
    }, [user, events]);

    const handleRsvp = async (eventId, currentStatus) => {
        if (currentStatus === 'going') {
            await leaveEvent(eventId);
            setMyRsvps(prev => { const n = { ...prev }; delete n[eventId]; return n; });
        } else {
            await joinEvent(eventId);
            setMyRsvps(prev => ({ ...prev, [eventId]: 'going' }));
        }
    };

    if (events.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <p>No upcoming events.</p>
                <button
                    onClick={onAdd}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--primary)',
                        color: 'var(--primary)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        marginTop: '12px',
                        cursor: 'pointer'
                    }}
                >
                    + Create Event
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {events.map(e => {
                const isGoing = myRsvps[e.id] === 'going';
                return (
                    <div key={e.id} style={{ background: 'var(--surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        {e.image_url && <div style={{ height: '120px', background: `url(${e.image_url}) center/cover` }} />}
                        <div style={{ padding: '16px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '4px' }}>
                                {new Date(e.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>{e.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{e.description}</p>
                            <button
                                onClick={() => handleRsvp(e.id, myRsvps[e.id])}
                                style={{
                                    width: '100%', padding: '12px', marginTop: '16px',
                                    background: isGoing ? 'var(--surface-highlight)' : 'var(--primary)',
                                    color: isGoing ? 'var(--text-main)' : '#000',
                                    border: isGoing ? '1px solid var(--border)' : 'none',
                                    borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                                }}>
                                {isGoing ? '✓ You are going' : 'Count me in'}
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}

export function GymChallenges({ challenges }) {
    const { user, joinChallenge } = useStore();
    const supabase = createClient();
    const [myChallenges, setMyChallenges] = useState({});

    useEffect(() => {
        if (!user) return;
        const fetchParticipation = async () => {
            const { data } = await supabase.from('challenge_participants').select('challenge_id, status, progress').eq('user_id', user.id);
            if (data) {
                const map = {};
                data.forEach(r => map[r.challenge_id] = r);
                setMyChallenges(map);
            }
        };
        fetchParticipation();
    }, [user, challenges]);

    const handleJoin = async (id) => {
        const success = await joinChallenge(id);
        if (success) {
            setMyChallenges(prev => ({ ...prev, [id]: { status: 'active', progress: 0 } }));
        }
    };

    if (!challenges || challenges.length === 0) {
        return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No active challenges. Check back soon!</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {challenges.map(c => {
                const joined = myChallenges[c.id];
                return (
                    <div key={c.id} style={{ background: 'var(--surface)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
                        <h3 style={{ margin: '0 0 8px 0' }}>{c.title}</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>{c.description}</p>

                        {joined ? (
                            <div style={{ background: 'var(--surface-highlight)', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                    <span>Progress</span>
                                    <span>{joined.progress || 0} / {c.target_value || 100}</span>
                                </div>
                                <div style={{ height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(100, ((joined.progress || 0) / (c.target_value || 1) * 100))}%`, height: '100%', background: 'var(--primary)' }} />
                                </div>
                                <button style={{ width: '100%', marginTop: '12px', padding: '8px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                                    Submit Result
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleJoin(c.id)}
                                style={{ width: '100%', padding: '12px', background: 'var(--brand-yellow)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Join Challenge
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
