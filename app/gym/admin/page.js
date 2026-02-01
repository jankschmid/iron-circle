"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import ConfirmationModal from '@/components/ConfirmationModal';
import InputModal from '@/components/InputModal';

function GymAdminPage() {
    const searchParams = useSearchParams();
    const gymId = searchParams.get('id');
    const { user } = useStore();
    // Fix: Singleton client
    const [supabase] = useState(() => createClient());
    const router = useRouter();

    const [origin, setOrigin] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

    const [gym, setGym] = useState(null);
    const [community, setCommunity] = useState(null);
    const [stats, setStats] = useState({ members: 0, todayVisits: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, members, settings

    // Members Tab State
    const [members, setMembers] = useState([]);
    const [memberSearch, setMemberSearch] = useState('');

    // Content Tab State
    const [tvSettings, setTvSettings] = useState({ enabled_features: ['live', 'leaderboard'], loop_duration_sec: 20 });
    const [contentData, setContentData] = useState({ news: [], events: [], challenges: [] });

    // TV Linking State
    const [connectingTv, setConnectingTv] = useState(false);
    const [monitors, setMonitors] = useState([]); // List of connected TVs

    const toast = useToast();

    // Modal States
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });
    const [inputModal, setInputModal] = useState({ isOpen: false });

    useEffect(() => {
        if (!user || !gymId) return;
        fetchGymDetails();
        fetchMonitors();
    }, [user, gymId]);

    const fetchMonitors = async () => {
        const { data, error } = await supabase
            .from('gym_monitors')
            .select('*')
            .eq('gym_id', gymId)
            .eq('status', 'active');

        if (data) setMonitors(data);
        if (error) console.error("Error fetching monitors:", error);
    };

    const handleLinkTv = async () => {
        const input = document.getElementById('tv-code-input');
        if (!input) return;

        const code = input.value.toUpperCase();
        if (code.length < 6) return toast.error("Invalid Code");

        setConnectingTv(true);
        try {
            // Add minimum delay for UX so user sees "Connecting..."
            const [rpcRes] = await Promise.all([
                supabase.rpc('link_gym_monitor', { p_code: code, p_gym_id: gym.id }),
                new Promise(resolve => setTimeout(resolve, 1500))
            ]);

            const { data, error } = rpcRes;

            if (error) throw error;
            if (data) {
                toast.success("Success! TV Connected.");
                input.value = '';
                fetchMonitors(); // Refresh list
            } else {
                toast.error("Code not found or expired.");
            }
        } catch (err) {
            toast.error("Error: " + err.message);
        } finally {
            setConnectingTv(false);
        }
    };

    const handleDisconnectMonitor = async (monitorId) => {
        setConfirmModal({
            isOpen: true,
            title: "Disconnect Screen?",
            message: "Disconnect this screen? It will return to pairing mode.",
            confirmText: "Disconnect",
            isDangerous: true,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                try {
                    const { error } = await supabase.rpc('disconnect_gym_monitor', { p_monitor_id: monitorId });
                    if (error) throw error;

                    // Optimistic update
                    setMonitors(prev => prev.filter(m => m.id !== monitorId));
                    toast.success("Monitor Disconnected.");
                    fetchMonitors(); // Verify with server
                } catch (err) {
                    toast.error("Error: " + err.message);
                }
            },
            onCancel: () => setConfirmModal({ isOpen: false })
        });
    };

    const fetchGymDetails = async () => {
        try {
            // 1. Fetch Gym Data
            const { data: gymData, error } = await supabase
                .from('gyms')
                .select('*')
                .eq('id', gymId)
                .single();

            if (error) throw error;

            // Security Check
            if (gymData.created_by !== user.id && !user.is_super_admin) {
                toast.error("Access Denied: You are not the owner of this gym.");
                router.push('/');
                return;
            }

            setGym(gymData);

            // 2. Fetch Community & Stats
            const { data: commData } = await supabase.from('communities').select('*').eq('gym_id', gymId).single();
            setCommunity(commData);

            if (commData) {
                const { count: memberCount } = await supabase
                    .from('community_members')
                    .select('user_id', { count: 'exact', head: true })
                    .eq('community_id', commData.id);

                // Visits
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const { count: visitCount } = await supabase
                    .from('workout_sessions')
                    .select('id', { count: 'exact', head: true })
                    .eq('gym_id', gymId)
                    .gt('start_time', startOfDay.toISOString());

                setStats({ members: memberCount || 0, todayVisits: visitCount || 0 });

                // Fetch Members List (Initial)
                fetchMembers(commData.id);
            }
            fetchTvContent();

        } catch (err) {
            console.error("Gym Admin Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTvContent = async () => {
        const { data: settings } = await supabase.from('gym_tv_settings').select('*').eq('gym_id', gymId).single();
        if (settings) setTvSettings(settings);
        else {
            const { data: newSettings } = await supabase.from('gym_tv_settings').insert({ gym_id: gymId }).select().single();
            if (newSettings) setTvSettings(newSettings);
        }

        const { data: news } = await supabase.from('gym_news').select('*').eq('gym_id', gymId).order('created_at', { ascending: false });
        const { data: events } = await supabase.from('gym_events').select('*').eq('gym_id', gymId).order('event_date', { ascending: true });
        const { data: challenges } = await supabase.from('gym_challenges').select('*').eq('gym_id', gymId).order('end_date', { ascending: true });

        setContentData({
            news: news || [],
            events: events || [],
            challenges: challenges || []
        });
    };

    const fetchMembers = async (commId, query = '') => {
        // 1. Fetch Memberships
        let q = supabase
            .from('community_members')
            .select('user_id, role, joined_at')
            .eq('community_id', commId)
            .order('joined_at', { ascending: false })
            .limit(1000);

        const { data: membersData, error } = await q;

        if (error) {
            console.error("Error fetching members:", JSON.stringify(error, null, 2));
            return;
        }

        if (membersData && membersData.length > 0) {
            // 2. Adjust for manual join
            const userIds = membersData.map(m => m.user_id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, username, avatar_url, privacy_settings')
                .in('id', userIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]));

            setMembers(membersData.map(m => {
                const profile = profileMap.get(m.user_id) || {};
                const isPrivate = !profile || profile.privacy_settings?.profile_visibility === 'private';
                return {
                    id: m.user_id,
                    ...profile,
                    role: m.role,
                    joined: m.joined_at,
                    isPrivate
                };
            }));
        } else {
            setMembers([]);
        }
    };

    const handleCreateCommunity = async () => {
        setConfirmModal({
            isOpen: true,
            title: "Initialize Community?",
            message: "Initialize Community for this gym?",
            confirmText: "Create Community",
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                const { error } = await supabase.from('communities').insert({
                    gym_id: gym.id,
                    name: gym.name,
                    description: `Official Community for ${gym.name}`,
                    gym_type: 'verified_partner',
                    privacy: 'public'
                });
                if (!error) {
                    toast.success("Community Created. Refreshing...");
                    fetchGymDetails();
                } else {
                    toast.error("Error: " + error.message);
                }
            },
            onCancel: () => setConfirmModal({ isOpen: false })
        });
    };

    // Auto-generate key if missing
    useEffect(() => {
        if (gym && !gym.display_key) {
            regenerateKey(true);
        }
    }, [gym]);

    const regenerateKey = async (silent = false) => {
        console.log("Regenerating Key for Gym:", gymId);

        const performRegen = async () => {
            const newKey = Math.random().toString(36).substring(2, 8).toUpperCase();
            console.log("New Key Generated:", newKey);

            const { error } = await supabase
                .from('gyms')
                .update({ display_key: newKey })
                .eq('id', gymId);

            if (error) {
                console.error("Key Update Error:", error);
                if (!silent) toast.error("Failed to update key: " + error.message);
            } else {
                setGym(prev => ({ ...prev, display_key: newKey }));
                if (!silent) toast.success("New Key Generated: " + newKey);
            }
        };

        if (!silent) {
            setConfirmModal({
                isOpen: true,
                title: "Regenerate Key?",
                message: "Are you sure? This will disconnect current displays.",
                confirmText: "Regenerate",
                isDangerous: true,
                onConfirm: async () => {
                    setConfirmModal({ isOpen: false });
                    await performRegen();
                },
                onCancel: () => setConfirmModal({ isOpen: false })
            });
        } else {
            await performRegen();
        }
    };

    // TV Settings Handlers
    const toggleTvFeature = async (feature) => {
        const current = new Set(tvSettings.enabled_features || []);
        if (current.has(feature)) current.delete(feature);
        else current.add(feature);

        const newFeatures = Array.from(current);
        await updateSettings({ enabled_features: newFeatures });
    };

    const handleDurationChange = async (feature, seconds) => {
        const oldDurations = tvSettings.feature_durations || {};
        const newDurations = { ...oldDurations, [feature]: parseInt(seconds) };
        await updateSettings({ feature_durations: newDurations });
    };

    const updateSettings = async (updates) => {
        setTvSettings(prev => ({ ...prev, ...updates }));
        await supabase.from('gym_tv_settings').update(updates).eq('gym_id', gymId);
    };

    // Content handlers
    const handleAddNews = async () => {
        setInputModal({
            isOpen: true,
            title: "Add News",
            fields: [
                { name: 'title', label: 'Title', type: 'text' },
                { name: 'content', label: 'Content', type: 'textarea' }
            ],
            confirmText: "Post News",
            onConfirm: async (values) => {
                setInputModal({ isOpen: false });
                if (!values.title || !values.content) return toast.error("Title and Content required");
                const { error } = await supabase.from('gym_news').insert({
                    gym_id: gymId,
                    title: values.title,
                    content: values.content,
                    is_active: true
                });
                if (!error) {
                    toast.success("News posted");
                    fetchTvContent();
                } else {
                    toast.error("Error posting news");
                }
            },
            onCancel: () => setInputModal({ isOpen: false })
        });
    };

    const handleEditNews = async (item) => {
        setInputModal({
            isOpen: true,
            title: "Edit News",
            fields: [
                { name: 'title', label: 'Title', type: 'text', defaultValue: item.title },
                { name: 'content', label: 'Content', type: 'textarea', defaultValue: item.content }
            ],
            confirmText: "Update",
            onConfirm: async (values) => {
                setInputModal({ isOpen: false });
                const { error } = await supabase.from('gym_news').update({
                    title: values.title,
                    content: values.content
                }).eq('id', item.id);
                if (!error) {
                    toast.success("News updated");
                    fetchTvContent();
                } else {
                    toast.error("Update failed");
                }
            },
            onCancel: () => setInputModal({ isOpen: false })
        });
    };

    const handleEditEvent = async (item) => {
        setInputModal({
            isOpen: true,
            title: "Edit Event",
            fields: [
                { name: 'title', label: 'Title', type: 'text', defaultValue: item.title },
                { name: 'date', label: 'Date', type: 'date', defaultValue: new Date(item.event_date).toISOString().split('T')[0] }
            ],
            confirmText: "Update",
            onConfirm: async (values) => {
                setInputModal({ isOpen: false });
                const { error } = await supabase.from('gym_events').update({
                    title: values.title,
                    event_date: new Date(values.date).toISOString()
                }).eq('id', item.id);
                if (!error) {
                    toast.success("Event updated");
                    fetchTvContent();
                } else {
                    toast.error("Update failed");
                }
            },
            onCancel: () => setInputModal({ isOpen: false })
        });
    };

    const handleEditChallenge = async (item) => {
        setInputModal({
            isOpen: true,
            title: "Edit Challenge",
            fields: [
                { name: 'title', label: 'Title', type: 'text', defaultValue: item.title },
                { name: 'description', label: 'Description', type: 'textarea', defaultValue: item.description }
            ],
            confirmText: "Update",
            onConfirm: async (values) => {
                setInputModal({ isOpen: false });
                const { error } = await supabase.from('gym_challenges').update({
                    title: values.title,
                    description: values.description
                }).eq('id', item.id);
                if (!error) {
                    toast.success("Challenge updated");
                    fetchTvContent();
                } else {
                    toast.error("Update failed");
                }
            },
            onCancel: () => setInputModal({ isOpen: false })
        });
    };

    const handleDeleteContent = async (table, id) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Content?",
            message: "Are you sure you want to delete this item?",
            confirmText: "Delete",
            isDangerous: true,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                const { error } = await supabase.from(table).delete().eq('id', id);
                if (!error) {
                    toast.success("Item deleted");
                    fetchTvContent();
                } else {
                    toast.error("Delete failed");
                }
            },
            onCancel: () => setConfirmModal({ isOpen: false })
        });
    };

    // --- Render Helpers ---

    if (!gymId) return <div style={{ padding: '40px', background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Gym ID missing.</div>;
    if (loading) return <div style={{ padding: '40px', background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Dashboard...</div>;
    if (!gym) return <div style={{ padding: '40px', background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Gym not found.</div>;

    return (
        <div className="dashboard-container" style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex' }}>
            <style jsx global>{`
                @media (max-width: 768px) {
                    .dashboard-container {
                        flex-direction: column;
                    }
                    .dashboard-sidebar {
                        width: 100% !important;
                        border-right: none !important;
                        border-bottom: 1px solid #222;
                        padding: 16px !important;
                    }
                    .dashboard-sidebar nav {
                        flex-direction: row !important;
                        flex-wrap: wrap;
                        gap: 8px;
                        margin-bottom: 16px;
                    }
                    .dashboard-sidebar nav button {
                        width: auto !important;
                        flex: 1;
                        justify-content: center;
                    }
                    .dashboard-content {
                        padding: 20px 16px !important;
                    }
                }
            `}</style>

            {/* Sidebar */}
            <aside className="dashboard-sidebar" style={{ width: '250px', borderRight: '1px solid #222', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Admin Panel</div>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>{gym.name}</h1>
                    {gym.is_verified && <div style={{ display: 'inline-block', marginTop: '8px', background: '#FFC800', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>VERIFIED PARTNER</div>}
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <NavBtn label="Overview" icon="📊" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                    <NavBtn label="TV Content" icon="📺" active={activeTab === 'content'} onClick={() => setActiveTab('content')} />
                    <NavBtn label="Members" icon="👥" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
                    <NavBtn label="Settings" icon="⚙️" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                </nav>

                <div style={{ marginTop: 'auto' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', textDecoration: 'none', padding: '12px', borderRadius: '8px', transition: '0.2s' }}>
                        <span>←</span> Back to App
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-content" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

                {activeTab === 'content' && (
                    <div style={{ maxWidth: '900px' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: '24px', fontWeight: 'bold' }}>TV Content Management</h2>

                        {/* 1. TV Configuration */}
                        <section style={{ marginBottom: '40px', background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222' }}>
                            <h3 style={{ margin: '0 0 16px', color: '#FFC800' }}>Screen Configuration & Timing</h3>
                            <p style={{ color: '#888', marginBottom: '16px', fontSize: '0.9rem' }}>Select active screens and set duration (seconds) for each.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fil, minmax(200px, 1fr))', gap: '20px' }}>
                                {['live', 'leaderboard', 'news', 'events', 'challenges'].map(feat => {
                                    const isEnabled = tvSettings.enabled_features?.includes(feat);
                                    const duration = tvSettings.feature_durations?.[feat] || 20;

                                    return (
                                        <div key={feat} style={{
                                            background: '#222', padding: '12px', borderRadius: '12px',
                                            border: isEnabled ? '1px solid #FFC800' : '1px solid #333',
                                            display: 'flex', flexDirection: 'column', gap: '12px'
                                        }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isEnabled}
                                                    onChange={() => toggleTvFeature(feat)}
                                                />
                                                {feat}
                                            </label>

                                            {isEnabled && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#888' }}>
                                                    <span>Duration:</span>
                                                    <input
                                                        type="number"
                                                        min="5" max="300"
                                                        value={duration}
                                                        onChange={(e) => handleDurationChange(feat, e.target.value)}
                                                        style={{
                                                            width: '60px', background: '#000', border: '1px solid #444',
                                                            color: '#fff', padding: '4px', borderRadius: '4px', textAlign: 'center'
                                                        }}
                                                    />
                                                    <span>s</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* 2. News */}
                        <section style={{ marginBottom: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>📢 News & Updates</h3>
                                <button onClick={handleAddNews} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ Add News</button>
                            </div>
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {contentData.news.map(item => (
                                    <div key={item.id} style={{ background: '#111', padding: '16px', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.title}</div>
                                            <div style={{ color: '#888' }}>{item.content}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleEditNews(item)} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                                            <button onClick={() => handleDeleteContent('gym_news', item.id)} style={{ background: '#300', color: '#f88', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                                {contentData.news.length === 0 && <div style={{ color: '#666', fontStyle: 'italic' }}>No news posted.</div>}
                            </div>
                        </section>

                        {/* 3. Events */}
                        <section style={{ marginBottom: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>📅 Upcoming Events</h3>
                                <button onClick={() => {
                                    setInputModal({
                                        isOpen: true,
                                        title: "Add Event",
                                        fields: [
                                            { name: 'title', label: 'Title', type: 'text' },
                                            { name: 'date', label: 'Date', type: 'date' }
                                        ],
                                        confirmText: "Add Event",
                                        onConfirm: async (values) => {
                                            setInputModal({ isOpen: false });
                                            if (!values.title || !values.date) return toast.error("Title and Date required");
                                            const { error } = await supabase.from('gym_events').insert({
                                                gym_id: gymId,
                                                title: values.title,
                                                event_date: new Date(values.date).toISOString()
                                            });
                                            if (!error) {
                                                toast.success("Event added");
                                                fetchTvContent();
                                            } else {
                                                toast.error("Error adding event");
                                            }
                                        },
                                        onCancel: () => setInputModal({ isOpen: false })
                                    })
                                }} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ Add Event</button>
                            </div>
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {contentData.events.map(item => (
                                    <div key={item.id} style={{ background: '#111', padding: '16px', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.title}</div>
                                            <div style={{ color: '#FFC800' }}>{new Date(item.event_date).toLocaleDateString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleEditEvent(item)} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                                            <button onClick={() => handleDeleteContent('gym_events', item.id)} style={{ background: '#300', color: '#f88', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                                {contentData.events.length === 0 && <div style={{ color: '#666', fontStyle: 'italic' }}>No upcoming events.</div>}
                            </div>
                        </section>

                        {/* 4. Challenges */}
                        <section style={{ marginBottom: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>🏆 Active Challenges</h3>
                                <button onClick={() => {
                                    setInputModal({
                                        isOpen: true,
                                        title: "Add Challenge",
                                        fields: [
                                            { name: 'title', label: 'Title', type: 'text' },
                                            { name: 'description', label: 'Description', type: 'textarea' }
                                        ],
                                        confirmText: "Add Challenge",
                                        onConfirm: async (values) => {
                                            setInputModal({ isOpen: false });
                                            if (!values.title) return toast.error("Title required");
                                            await supabase.from('gym_challenges').insert({
                                                gym_id: gymId,
                                                title: values.title,
                                                description: values.description
                                            });
                                            toast.success("Challenge added");
                                            fetchTvContent();
                                        },
                                        onCancel: () => setInputModal({ isOpen: false })
                                    })
                                }} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ Add Challenge</button>
                            </div>
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {contentData.challenges.map(item => (
                                    <div key={item.id} style={{ background: '#111', padding: '16px', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.title}</div>
                                            <div style={{ color: '#888' }}>{item.description}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleEditChallenge(item)} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                                            <button onClick={() => handleDeleteContent('gym_challenges', item.id)} style={{ background: '#300', color: '#f88', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                                {contentData.challenges.length === 0 && <div style={{ color: '#666', fontStyle: 'italic' }}>No active challenges.</div>}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div style={{ maxWidth: '900px' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: '24px', fontWeight: 'bold' }}>Dashboard Overview</h2>

                        {/* Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                            <StatCard label="Total Members" value={stats.members} icon="👥" />
                            <StatCard label="Visits Today" value={stats.todayVisits} icon="🔥" highlight />
                            <StatCard label="Live Now" value="-" icon="🔴" note="(Check Monitor)" />
                        </div>

                        {/* Monitor Config */}
                        <section style={{ marginBottom: '40px', background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Step 1: Live Monitor</h3>
                                <Link
                                    href={`/gym/display?id=${gym.id}`}
                                    target="_blank"
                                    style={{ background: '#222', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem' }}
                                >
                                    Open Web Link ↗
                                </Link>
                            </div>

                            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                                {/* Option A: TV Pairing */}
                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <h4 style={{ color: '#FFC800', marginBottom: '12px' }}>Option A: Smart TV (Recommended)</h4>
                                    <p style={{ color: '#888', marginBottom: '16px', fontSize: '0.9rem' }}>
                                        Open <strong>{origin}/tv</strong> on your Gym TV and enter the code shown there:
                                    </p>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <input
                                            id="tv-code-input"
                                            type="text"
                                            placeholder="Ex: A7X-9P2"
                                            maxLength={7}
                                            disabled={connectingTv}
                                            style={{
                                                background: connectingTv ? '#222' : '#000',
                                                border: '1px solid #333', color: connectingTv ? '#666' : '#fff',
                                                padding: '12px', borderRadius: '8px', flex: 1,
                                                fontSize: '1.2rem', fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase'
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleLinkTv();
                                            }}
                                        />
                                        <button
                                            onClick={handleLinkTv}
                                            disabled={connectingTv}
                                            style={{
                                                background: connectingTv ? '#444' : '#FFC800',
                                                color: connectingTv ? '#888' : '#000',
                                                border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 'bold', cursor: connectingTv ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {connectingTv ? 'Connecting...' : 'Connect'}
                                        </button>
                                    </div>

                                    {/* Connected Monitors List */}
                                    {monitors.length > 0 && (
                                        <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '16px' }}>
                                            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Connected Screens</div>
                                            {monitors.map(m => (
                                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#222', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                                                    <div>
                                                        <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>TV {m.pairing_code}</div>
                                                        <div style={{ color: '#888', fontSize: '0.8rem' }}>Active • Connected {new Date(m.updated_at).toLocaleDateString()}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDisconnectMonitor(m.id)}
                                                        style={{ background: '#330000', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        Disconnect
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Divider */}
                                <div style={{ width: '1px', background: '#222' }}></div>

                                {/* Option B: Key */}
                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <h4 style={{ color: '#fff', marginBottom: '12px' }}>Option B: Manual Key</h4>
                                    <p style={{ color: '#888', marginBottom: '16px', fontSize: '0.9rem' }}>
                                        Legacy: Connect a TV screen to <strong>{origin}/gym/display?id={gym.id}</strong> and enter this key:
                                    </p>
                                    <div style={{ display: 'flex', gap: '12px', background: '#000', padding: '10px', borderRadius: '8px', border: '1px solid #333' }}>
                                        <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px', color: '#888', flex: 1 }}>
                                            {gym.display_key || '----'}
                                        </div>
                                        <button onClick={regenerateKey} style={{ background: '#222', border: 'none', color: '#fff', padding: '0 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Regen</button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* QR Code / Check-in */}
                        <section style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222' }}>
                            <h3 style={{ fontSize: '1.2rem', margin: '0 0 20px 0' }}>Step 2: Member Check-in</h3>
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                <div style={{ background: '#fff', padding: '12px', borderRadius: '8px' }}>
                                    {/* Simple QR Code to Gym Page */}
                                    {/* In a real app, generate this robustly. Here using an API for immediate result. */}
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${origin}/community?id=${community?.id}`)}`}
                                        alt="Gym QR"
                                        style={{ display: 'block' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                                        Print this QR Code and place it at your front desk.
                                        Members scan it to <strong>Join the Community</strong> and unlock the Monitor.
                                    </p>
                                    {!community && (
                                        <div style={{ padding: '12px', background: 'rgba(255,0,0,0.1)', border: '1px solid red', borderRadius: '8px', color: '#ffaaaa' }}>
                                            ⚠️ No Community Linked!
                                            <button onClick={handleCreateCommunity} style={{ marginLeft: '12px', background: '#d00', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Create Now</button>
                                        </div>
                                    )}
                                    {community && <div style={{ color: '#0f0', fontSize: '0.9rem' }}>✅ Community Active: {community.name}</div>}
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'members' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Member Management</h2>
                            {/* <button style={{ background: '#fff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}>+ Invite</button> */}
                        </div>

                        <div style={{ background: '#111', borderRadius: '12px', border: '1px solid #222', overflow: 'hidden', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ borderBottom: '1px solid #222', background: '#181818' }}>
                                    <tr>
                                        <th style={{ padding: '16px', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>User</th>
                                        <th style={{ padding: '16px', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Role</th>
                                        <th style={{ padding: '16px', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Joined</th>
                                        <th style={{ padding: '16px', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Private Members Summary Row */}
                                    {members.filter(m => m.isPrivate).length > 0 && (
                                        <tr style={{ borderBottom: '1px solid #222', background: 'rgba(255, 255, 255, 0.05)' }}>
                                            <td colSpan="4" style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#aaa', fontStyle: 'italic' }}>
                                                    <span>🔒</span>
                                                    <span>Private Members: <strong>{members.filter(m => m.isPrivate).length}</strong></span>
                                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(Counted in total stats, but hidden from list)</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {members.filter(m => !m.isPrivate).length === 0 && members.filter(m => m.isPrivate).length === 0 ? (
                                        <tr><td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>No members found.</td></tr>
                                    ) : members.filter(m => !m.isPrivate).map(m => (
                                        <tr key={m.id} style={{ borderBottom: '1px solid #222' }}>
                                            <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {m.avatar_url ?
                                                    <img src={m.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%' }} /> :
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#333' }} />
                                                }
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{m.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>@{m.username}</div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    background: m.role === 'admin' ? '#FFC800' : m.role === 'trainer' ? '#00f' : '#222',
                                                    color: m.role === 'admin' ? '#000' : '#fff',
                                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'
                                                }}>
                                                    {m.role || 'Member'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', color: '#888', fontSize: '0.9rem' }}>
                                                {new Date(m.joined).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <button style={{ background: 'transparent', border: '1px solid #333', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Manage</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div style={{ maxWidth: '600px' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '24px' }}>Gym Settings</h2>
                        <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222', marginBottom: '24px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Gym Name</label>
                                <input type="text" defaultValue={gym.name} disabled style={{ width: '100%', padding: '12px', background: '#222', border: 'none', color: '#666', borderRadius: '8px' }} />
                                <div style={{ fontSize: '0.8rem', color: '#444', marginTop: '4px' }}>Contact Super Admin to change name</div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Address</label>
                                <input type="text" defaultValue={gym.address} disabled style={{ width: '100%', padding: '12px', background: '#222', border: 'none', color: '#666', borderRadius: '8px' }} />
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function NavBtn({ label, icon, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px',
                background: active ? '#222' : 'transparent',
                color: active ? '#fff' : '#888',
                border: 'none', borderRadius: '8px',
                cursor: 'pointer', textAlign: 'left',
                fontWeight: active ? 'bold' : 'normal',
                fontSize: '0.95rem'
            }}
        >
            <span>{icon}</span> {label}
        </button>
    );
}

function StatCard({ label, value, icon, highlight, note }) {
    return (
        <div style={{
            background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222',
            boxShadow: highlight ? '0 0 20px rgba(255, 200, 0, 0.1)' : 'none'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ color: '#888', fontSize: '0.9rem' }}>{label}</div>
                <div style={{ fontSize: '1.2rem' }}>{icon}</div>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: highlight ? '#FFC800' : '#fff' }}>
                {value}
            </div>
            {note && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>{note}</div>}
        </div>
    );
}

import { Suspense } from 'react';

export default function GymAdminPageWrapper() {
    return (
        <Suspense fallback={<div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading Admin Panel...</div>}>
            <GymAdminPage />
        </Suspense>
    );
}
