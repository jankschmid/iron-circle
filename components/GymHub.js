// ... imports
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useTranslation } from '@/context/TranslationContext';
import { useToast } from '@/components/ToastProvider';
import GymChat from './GymChat';
import GymAdminModal from './GymAdminModal';

export default function GymHub({ communityId, gymId, initialView = 'lobby' }) {
    const { t } = useTranslation();
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

    // UI State
    const [showAdmin, setShowAdmin] = useState(false);
    const [showLiveFloor, setShowLiveFloor] = useState(false); // Live Floor Modal
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Fetch All Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Gym Details
                const { data: gymData } = await supabase.from('gyms').select('*').eq('id', gymId).single();
                setGym(gymData);

                // 2. Live Users (Initial Load)
                // Use V2 RPC to avoid schema cache issues and ambiguity
                const { data: active, error: activeError } = await supabase.rpc('get_live_gym_activity_v2', {
                    p_gym_id: gymId
                });

                if (activeError) {
                    console.error("Error fetching live activity:", activeError);
                } else if (active) {
                    setLiveUsers(active);
                }

                // 3. News
                const { data: newsData } = await supabase.from('gym_news').select('*').eq('gym_id', gymId).eq('is_active', true).order('created_at', { ascending: false });
                setNews(newsData || []);

                // 4. Events
                const { data: eventsData } = await supabase.from('gym_events').select('*').eq('gym_id', gymId).gte('event_date', new Date().toISOString()).order('event_date', { ascending: true });
                setEvents(eventsData || []);

                // 4b. Challenges
                const { data: challengesData } = await supabase.from('gym_challenges').select('*').eq('gym_id', gymId);
                // Filter client side for now to be safe until schema is confirmed
                setChallenges(challengesData?.filter(c => c.is_active !== false) || []);

                // 5. Leaderboard (Real)
                const { data: lbData } = await supabase.rpc('get_gym_leaderboard', {
                    p_gym_id: gymId,
                    p_metric: 'volume',
                    p_days: 30
                });
                setLeaderboard(lbData || []);

            } catch (err) {
                console.error("GymHub Load Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Standard Poll (Content/Backgroud) every 30s
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [gymId, refreshTrigger]);

    // Handle initial loading
    if (loading) return <div style={{ background: 'var(--background)', height: '100vh' }}></div>;

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', color: 'var(--foreground)', paddingBottom: '90px' }}>
            {/* 1. HERO SECTION */}
            <div style={{ position: 'relative', height: '28vh', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: gym?.cover_image ? `url(${gym.cover_image}) center/cover` : 'var(--surface)',
                    opacity: 0.6
                }} />
                {/* Gradient Overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), var(--background))' }} />

                <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '16px',
                                background: gym?.logo_url ? `url(${gym.logo_url}) center/cover` : 'var(--surface-highlight)',
                                border: '2px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                            }} />
                            <div style={{ marginBottom: '4px' }}>
                                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '-0.5px' }}>{gym?.name}</h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                    <span style={{
                                        background: 'rgba(255, 200, 0, 0.2)', color: '#FFC800', border: '1px solid rgba(255, 200, 0, 0.3)',
                                        padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold'
                                    }}>{t('Verified Partner')}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>📍 {gym?.city || 'Iron Circle'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Admin Button - Staff Only */}
                        {['owner', 'admin', 'trainer'].includes(user?.gyms?.find(g => g.id === gymId)?.role) && (
                            <button
                                onClick={() => setShowAdmin(true)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    width: '40px', height: '40px',
                                    borderRadius: '12px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                ⚙️
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. LIVE BAR (Stories Style) */}
            <div style={{ padding: '24px 0 24px 20px' }}>
                <div
                    onClick={() => setShowLiveFloor(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}
                >
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', zIndex: 1 }} />
                        <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--success)', opacity: 0.5, animation: 'pulse 2s infinite' }} />
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--foreground)', letterSpacing: '0.5px' }}>
                        {t('Live Floor')} <span style={{ color: 'var(--text-muted)', fontWeight: '400', marginLeft: '4px' }}>• {liveUsers.length} {t('Active')}</span>
                    </span>
                    <span style={{ marginLeft: 'auto', marginRight: '20px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600' }}>{t('View All')} →</span>
                </div>

                <div
                    onClick={() => setShowLiveFloor(true)}
                    style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingRight: '20px', scrollbarWidth: 'none', cursor: 'pointer' }}
                >
                    {liveUsers.slice(0, 10).map(u => (
                        <div key={u.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '64px' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '50%',
                                padding: '2px', // Border space
                                background: u.role === 'owner' ? 'linear-gradient(45deg, #FFD700, #FFA500)' : (u.role === 'trainer' ? 'var(--brand-yellow)' : 'linear-gradient(45deg, var(--primary), #00d2ff)'),
                                position: 'relative'
                            }}>
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid var(--background)', overflow: 'hidden' }}>
                                    <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', background: 'var(--surface)' }} />
                                </div>
                            </div>
                            <span style={{ fontSize: '0.75rem', marginTop: '8px', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontWeight: '500' }}>
                                {u.username}
                            </span>
                        </div>
                    ))}

                    {liveUsers.length === 0 && (
                        <div style={{
                            background: 'var(--surface)', padding: '12px 20px', borderRadius: '12px',
                            color: 'var(--text-muted)', fontSize: '0.9rem', width: '100%', textAlign: 'center', border: '1px dashed var(--border)'
                        }}>
                            {t('The floor is quiet... Be the first!')}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. TABS */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(10px)' }}>
                {['lobby', 'leaderboard', 'events', 'challenges'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1, padding: '16px', background: 'transparent', border: 'none',
                            color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === tab ? '900' : '600',
                            borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                            textTransform: 'uppercase', cursor: 'pointer', fontSize: '0.85rem', letterSpacing: '0.5px'
                        }}
                    >
                        {t(tab.charAt(0).toUpperCase() + tab.slice(1))}
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
                            <GymChat communityId={communityId} gymId={gymId} news={news} />
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
                            <GymEvents events={events} gymId={gymId} onAdd={() => setShowAdmin(true)} />
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

            {/* MODALS */}
            {showAdmin && (
                <GymAdminModal
                    gymId={gymId}
                    onClose={() => {
                        setShowAdmin(false);
                        setRefreshTrigger(prev => prev + 1); // Trigger Refresh
                    }}
                />
            )}

            <AnimatePresence>
                {showLiveFloor && (
                    <LiveFloorModal
                        gymId={gymId}
                        initialUsers={liveUsers}
                        onClose={() => setShowLiveFloor(false)}
                    />
                )}
            </AnimatePresence>
            <BottomNav />
        </div>
    );
}

// --- SUB COMPONENTS ---

export function LiveFloorModal({ gymId, initialUsers, onClose }) {
    const { t } = useTranslation();
    const supabase = createClient();
    const [users, setUsers] = useState(initialUsers || []);

    // High Frequency Polling (5s) to match TV
    useEffect(() => {
        const fetchLive = async () => {
            const { data: active, error } = await supabase.rpc('get_live_gym_activity_v2', {
                p_gym_id: gymId
            });

            if (active && !error) {
                setUsers(active);
            }
        };

        const interval = setInterval(fetchLive, 5000); // 5s Sync
        return () => clearInterval(interval);
    }, [gymId]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 90, // Below BottomNav (100)
                background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)',
                display: 'flex', flexDirection: 'column'
            }}
        >
            {/* Header */}
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#fff', letterSpacing: '1px' }}>{t('Live Floor')}</h2>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }} />
                        {t('Syncing every 5s')}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                    ✕
                </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '100px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                    {users.map(u => (
                        <div key={u.user_id} style={{
                            background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px',
                            border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                        }}>
                            <div style={{ position: 'relative', marginBottom: '12px' }}>
                                <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`}
                                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
                                {u.role === 'trainer' && (
                                    <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--brand-yellow)', color: '#000', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>T</div>
                                )}
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: '4px' }}>{u.username}</div>
                            <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '8px' }}>
                                {u.current_exercise || t('Working out')}
                            </div>
                            {u.current_set && (
                                <div style={{ fontSize: '0.75rem', background: 'var(--primary)', color: '#000', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                                    {t('Set')} {u.current_set}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {users.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: '100px', color: '#666' }}>
                        <h3>{t('The floor is empty')}</h3>
                        <p>{t('Start a workout to see yourself here!')}</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function GymLeaderboard({ leaders }) {
    const { t } = useTranslation();
    // ... rest of previous code unchanged
    if (!leaders || leaders.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                {t('No rankings yet. Start logging workouts!')}
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>{t('This Month')}</h2>
                <select style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px' }}>
                    <option>{t('Volume')}</option>
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
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontWeight: 600 }}>{l.name || l.username || 'Athlete'}</span>
                                    {l.role === 'owner' && <span title="Owner">👑</span>}
                                    {l.role === 'admin' && <span title="Admin">🛡️</span>}
                                    {l.role === 'trainer' && <span title="Trainer">💪</span>}
                                </div>
                            </div>
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


function GymEvents({ events, gymId, onAdd }) {
    const { t } = useTranslation();
    const { user, joinEvent, leaveEvent } = useStore();
    const supabase = createClient();
    const [myRsvps, setMyRsvps] = useState({});

    // Check Logic
    const isStaff = user?.gyms?.find(g => g.id === gymId && ['owner', 'admin', 'trainer'].includes(g.role));

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
                <p>{t('No upcoming events.')}</p>
                {isStaff && (
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
                        + {t('Create Event')}
                    </button>
                )}
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
                                {isGoing ? t('You are going') : t('Count me in')}
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}

export function GymChallenges({ challenges }) {
    const { t } = useTranslation();
    const { user, joinChallenge } = useStore();
    const supabase = createClient();
    const [myChallenges, setMyChallenges] = useState({});

    const [showSubmitModal, setShowSubmitModal] = useState(null); // challengeId

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
        return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('No active challenges. Check back soon!')}</div>;
    }

    return (
        <>
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
                                        <span>{t('Progress')}</span>
                                        <span>{joined.progress || 0} / {c.target_value || 100}</span>
                                    </div>
                                    <div style={{ height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, ((joined.progress || 0) / (c.target_value || 1) * 100))}%`, height: '100%', background: 'var(--primary)' }} />
                                    </div>
                                    <button
                                        onClick={() => setShowSubmitModal(c)}
                                        style={{ width: '100%', marginTop: '12px', padding: '8px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        {t('Submit Result')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleJoin(c.id)}
                                    style={{ width: '100%', padding: '12px', background: 'var(--brand-yellow)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    {t('Join Challenge')}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {showSubmitModal && (
                <SubmitResultModal
                    challenge={showSubmitModal}
                    onClose={() => setShowSubmitModal(null)}
                />
            )}
        </>
    );
}

function SubmitResultModal({ challenge, onClose }) {
    const { t } = useTranslation();
    const supabase = createClient();
    const [value, setValue] = useState('');
    const [proof, setProof] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!value) return toast.error(t("Please enter a value"));
        setLoading(true);

        try {
            const { data, error } = await supabase.rpc('submit_challenge_result', {
                p_challenge_id: challenge.id,
                p_value: parseFloat(value),
                p_proof_url: proof || null,
                p_note: note || null
            });

            if (error) throw error;

            if (data.success) {
                toast.success(t("Result Submitted! Pending verification."));
                onClose();
            } else {
                toast.error(`${t("Submission failed")}: ${data.message}`);
            }
        } catch (err) {
            console.error(err);
            toast.error(`${t("Error")}: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--surface)', width: '100%', maxWidth: '400px',
                borderRadius: '16px', padding: '24px', border: '1px solid var(--border)'
            }} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 16px 0' }}>{t('Submit Result')}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{challenge.title}</p>

                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>{t('Value')} (e.g. kg, reps)</label>
                <input
                    type="number"
                    value={value} onChange={e => setValue(e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', marginBottom: '16px' }}
                />

                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>{t('Proof URL')} ({t('Optional')})</label>
                <input
                    type="text"
                    value={proof} onChange={e => setProof(e.target.value)}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', marginBottom: '16px' }}
                />

                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>{t('Note')}</label>
                <textarea
                    value={note} onChange={e => setNote(e.target.value)}
                    placeholder={t('Notes (Optional)')}
                    style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', marginBottom: '24px', resize: 'vertical' }}
                />

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer' }}>
                        {t('Cancel')}
                    </button>
                    <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '12px', background: 'var(--primary)', border: 'none', color: '#000', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {loading ? t('Saving...') : t('Submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}
