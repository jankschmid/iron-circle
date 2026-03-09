"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import ConfirmationModal from '@/components/ConfirmationModal';
import InputModal from '@/components/InputModal';
import { pushTemplates, injectTemplateVariables } from '@/lib/pushTemplates';
import { downloadCSV } from '@/lib/csv';
import { useTranslation } from '@/context/TranslationContext';

// Tabs
import AnalyticsTab from './tabs/AnalyticsTab';
import OverviewTab from './tabs/OverviewTab';
import TvContentTab from './tabs/TvContentTab';
import OperationsTab from './tabs/OperationsTab';
import MembersTab from './tabs/MembersTab';
import InvitesTab from './tabs/InvitesTab';
import SettingsTab from './tabs/SettingsTab';
import BroadcastTab from './tabs/BroadcastTab';

// Components
import StatCard from './components/StatCard';
import NavBtn from './components/NavBtn';

function GymAdminPage() {
    const { t } = useTranslation();
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
    const [manageModal, setManageModal] = useState({ isOpen: false, member: null });
    const [broadcastStartAudience, setBroadcastStartAudience] = useState('all');

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
        if (code.length < 6) return toast.error(t("Invalid Code"));

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
                toast.success(t("Success! TV Connected."));
                input.value = '';
                fetchMonitors(); // Refresh list
            } else {
                toast.error(t("Code not found or expired."));
            }
        } catch (err) {
            toast.error(t("Error") + ": " + err.message);
        } finally {
            setConnectingTv(false);
        }
    };

    const handleDisconnectMonitor = async (monitorId) => {
        setConfirmModal({
            isOpen: true,
            title: t("Disconnect Screen?"),
            message: t("Disconnect this screen? It will return to pairing mode."),
            confirmText: t("Disconnect"),
            isDangerous: true,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                try {
                    const { error } = await supabase.rpc('disconnect_gym_monitor', { p_monitor_id: monitorId });
                    if (error) throw error;

                    // Optimistic update
                    setMonitors(prev => prev.filter(m => m.id !== monitorId));
                    toast.success(t("Monitor Disconnected."));
                    fetchMonitors(); // Verify with server
                } catch (err) {
                    toast.error(t("Error") + ": " + err.message);
                }
            },
            onCancel: () => setConfirmModal({ isOpen: false })
        });
    };

    const handleUpdateRole = async (userId, newRole) => {
        const { error } = await supabase.from('user_gyms').upsert({
            user_id: userId,
            gym_id: gymId,
            role: newRole
        }, { onConflict: 'user_id, gym_id' });

        if (error) {
            toast.error(t("Failed to update role") + ": " + error.message);
        } else {
            toast.success(t("Role updated"));
            if (community) fetchMembers(community.id);
            setManageModal({ isOpen: false, member: null });
        }
    };

    const handleKickMember = async (userId) => {
        if (!community) return;
        setConfirmModal({
            isOpen: true,
            title: t("Remove Member?"),
            message: t("Are you sure you want to remove this member from the gym? They will lose access to the community."),
            confirmText: t("Remove"),
            isDangerous: true,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });

                await supabase.from('community_members').delete().eq('community_id', community.id).eq('user_id', userId);
                await supabase.from('user_gyms').delete().eq('gym_id', gymId).eq('user_id', userId);

                toast.success(t("Member removed"));
                if (community) fetchMembers(community.id);
                setManageModal({ isOpen: false, member: null });
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

            if (error) throw error;

            // Security Check
            // Allow: Super Admin, Creator, OR Gym Admin/Owner role
            let hasAccess = false;
            if (user.is_super_admin) hasAccess = true;
            if (gymData.created_by === user.id) hasAccess = true;

            if (!hasAccess) {
                const { data: roleData } = await supabase
                    .from('user_gyms')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('gym_id', gymId)
                    .single();

                if (roleData && (roleData.role === 'admin' || roleData.role === 'owner')) {
                    hasAccess = true;
                }
            }

            if (!hasAccess) {
                toast.error(t("Access Denied: You are not an admin of this gym."));
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
        const { data: challenges } = await supabase
            .from('gym_challenges')
            .select('*, teams:challenge_teams(id, team_name)')
            .eq('gym_id', gymId)
            .order('end_date', { ascending: true });

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
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, name, username, avatar_url, privacy_settings, last_workout_date, yearly_workout_goal, current_xp, lifetime_volume, is_super_admin')
                .in('id', userIds);

            if (profileError) {
                console.error("DEBUG PROFILE ERROR:", JSON.stringify(profileError, null, 2));
            }

            // Fetch streaks separately
            const { data: streaks } = await supabase
                .from('user_streaks')
                .select('user_id, current_streak')
                .in('user_id', userIds);

            // Fetch true gym roles
            const { data: gymRoles } = await supabase
                .from('user_gyms')
                .select('user_id, role')
                .eq('gym_id', gymId)
                .in('user_id', userIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]));
            const streakMap = new Map(streaks?.map(s => [s.user_id, s.current_streak]));
            const gymRoleMap = new Map(gymRoles?.map(g => [g.user_id, g.role]));

            setMembers(membersData.map(m => {
                const profile = profileMap.get(m.user_id) || {};
                const streak = streakMap.get(m.user_id) || 0;
                const isPrivate = !profile || profile.privacy_settings?.profile_visibility === 'private';

                // Determine true role (gym_role > community_role) and super_admin overrides
                let finalRole = m.role;
                if (gymRoleMap.has(m.user_id)) {
                    finalRole = gymRoleMap.get(m.user_id);
                }

                // Gym creators are the defacto owners of the gym
                if (gym && gym.created_by === m.user_id) {
                    finalRole = 'owner';
                }

                // Super admins override all local roles in the UI
                if (profile.is_super_admin) {
                    finalRole = 'super_admin';
                }

                return {
                    id: m.user_id,
                    ...profile,
                    current_streak: streak,
                    role: finalRole,
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
            title: t("Initialize Community?"),
            message: t("Initialize Community for this gym?"),
            confirmText: t("Create Community"),
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
                    toast.success(t("Community Created. Refreshing..."));
                    fetchGymDetails();
                } else {
                    toast.error(t("Error") + ": " + error.message);
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
                if (!silent) toast.error(t("Failed to update key") + ": " + error.message);
            } else {
                setGym(prev => ({ ...prev, display_key: newKey }));
                if (!silent) toast.success(t("New Key Generated") + ": " + newKey);
            }
        };

        if (!silent) {
            setConfirmModal({
                isOpen: true,
                title: t("Regenerate Key?"),
                message: t("Are you sure? This will disconnect current displays."),
                confirmText: t("Regenerate"),
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
    const renderVarHelper = (targetField) => {
        return (values, handleChange) => (
            <div style={{ marginTop: '-8px', marginBottom: '16px', fontSize: '0.8rem', color: '#888' }}>
                <span style={{ color: '#aaa' }}>{t('You can use the following variables:')}</span> <br />
                {['{name}', '{streak}', '{gym_name}', '{hours_left}', '{next_streak}'].map(v => (
                    <span key={v}
                        onClick={() => handleChange(targetField, (values[targetField] || '') + ' ' + v)}
                        style={{ cursor: 'pointer', background: '#333', padding: '2px 6px', borderRadius: '4px', margin: '4px 4px 0 0', display: 'inline-block', color: '#FFC800' }}>
                        {v}
                    </span>
                ))}
            </div>
        );
    };

    const handleAddNews = async () => {
        setInputModal({
            isOpen: true,
            title: t("Add News"),
            fields: [
                { name: 'title', label: t('Title'), type: 'text' },
                { name: 'content', label: t('Content'), type: 'textarea' },
                { name: 'helper', type: 'custom', render: renderVarHelper('content') }
            ],
            confirmText: t("Post News"),
            onConfirm: async (values) => {
                setInputModal({ isOpen: false });
                if (!values.title || !values.content) return toast.error(t("Title and Content required"));
                const { error } = await supabase.from('gym_news').insert({
                    gym_id: gymId,
                    title: values.title,
                    content: values.content,
                    is_active: true
                });
                if (!error) {
                    toast.success(t("News posted"));
                    fetchTvContent();
                } else {
                    toast.error(t("Error posting news"));
                }
            },
            onCancel: () => setInputModal({ isOpen: false })
        });
    };

    const handleEditNews = async (item) => {
        setInputModal({
            isOpen: true,
            title: t("Edit News"),
            fields: [
                { name: 'title', label: t('Title'), type: 'text', defaultValue: item.title },
                { name: 'content', label: t('Content'), type: 'textarea', defaultValue: item.content },
                { name: 'helper', type: 'custom', render: renderVarHelper('content') }
            ],
            confirmText: t("Update"),
            onConfirm: async (values) => {
                setInputModal({ isOpen: false });
                const { error } = await supabase.from('gym_news').update({
                    title: values.title,
                    content: values.content
                }).eq('id', item.id);
                if (!error) {
                    toast.success(t("News updated"));
                    fetchTvContent();
                } else {
                    toast.error(t("Update failed"));
                }
            },
            onCancel: () => setInputModal({ isOpen: false })
        });
    };

    const handleEditEvent = async (item) => {
        setInputModal({
            isOpen: true,
            title: t("Edit Event"),
            fields: [
                { name: 'title', label: t('Title'), type: 'text', defaultValue: item.title },
                { name: 'date', label: t('Date'), type: 'date', defaultValue: new Date(item.event_date).toISOString().split('T')[0] }
            ],
            confirmText: t("Update"),
            onConfirm: async (values) => {
                setInputModal({ isOpen: false });
                const { error } = await supabase.from('gym_events').update({
                    title: values.title,
                    event_date: new Date(values.date).toISOString()
                }).eq('id', item.id);
                if (!error) {
                    toast.success(t("Event updated"));
                    fetchTvContent();
                } else {
                    toast.error(t("Update failed"));
                }
            },
            onCancel: () => setInputModal({ isOpen: false })
        });
    };

    const handleEditChallenge = async (item) => {
        setInputModal({
            isOpen: true,
            title: t("Edit Challenge"),
            fields: [
                { name: 'title', label: t('Title'), type: 'text', defaultValue: item.title },
                { name: 'description', label: t('Description'), type: 'textarea', defaultValue: item.description },
                { name: 'helper', type: 'custom', render: renderVarHelper('description') },
                { name: 'target_value', label: t('Target Value (Goal)'), type: 'number', defaultValue: item.target_value },
                { name: 'target_unit', label: t('Unit (e.g. kg, reps, hours)'), type: 'text', defaultValue: item.target_unit }
            ],
            confirmText: t("Update"),
            onConfirm: async (values) => {
                setInputModal({ isOpen: false });
                const { error } = await supabase.from('gym_challenges').update({
                    title: values.title,
                    description: values.description,
                    target_value: values.target_value ? parseFloat(values.target_value) : null,
                    target_unit: values.target_unit || null
                }).eq('id', item.id);
                if (!error) {
                    toast.success(t("Challenge updated"));
                    fetchTvContent();
                } else {
                    toast.error(t("Update failed"));
                }
            },
            onCancel: () => setInputModal({ isOpen: false })
        });
    };

    const handleDeleteContent = async (table, id) => {
        setConfirmModal({
            isOpen: true,
            title: t("Delete Content?"),
            message: t("Are you sure you want to delete this item?"),
            confirmText: t("Delete"),
            isDangerous: true,
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                const { error } = await supabase.from(table).delete().eq('id', id);
                if (!error) {
                    toast.success(t("Item deleted"));
                    fetchTvContent();
                } else {
                    toast.error(t("Delete failed"));
                }
            },
            onCancel: () => setConfirmModal({ isOpen: false })
        });
    };

    // --- Invites Logic ---
    const [invites, setInvites] = useState([]);

    const fetchInvites = async () => {
        const { data, error } = await supabase
            .from('gym_invites')
            .select('*')
            .eq('gym_id', gymId)
            .order('created_at', { ascending: false });

        if (data) setInvites(data);
    };

    // Load invites when tab is active
    useEffect(() => {
        if (activeTab === 'invites' && gymId) {
            fetchInvites();
        }
    }, [activeTab, gymId]);

    const handleCreateInvite = async (role, type) => {
        // type: 'one_time', '24h', 'unlimited'
        let max_uses = type === 'one_time' ? 1 : null;
        let expires_at = null;
        if (type === '24h') {
            const d = new Date();
            d.setHours(d.getHours() + 24);
            expires_at = d.toISOString();
        }

        const code = Math.random().toString(36).substring(2, 10).toUpperCase();

        const { error } = await supabase.from('gym_invites').insert({
            gym_id: gymId,
            role,
            code,
            max_uses,
            expires_at,
            created_by: user.id
        });

        if (error) {
            toast.error(t("Failed to create invite") + ": " + error.message);
        } else {
            toast.success(t("Invite Created!"));
            fetchInvites();
        }
    };

    const handleDeleteInvite = async (id) => {
        const { error } = await supabase.from('gym_invites').delete().eq('id', id);
        if (!error) {
            toast.success(t("Invite Revoked"));
            fetchInvites();
        }
    };


    if (!gymId) return <div style={{ padding: '40px', background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('Gym ID missing.')}</div>;
    if (loading) return <div style={{ padding: '40px', background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('Loading Dashboard...')}</div>;
    if (!gym) return <div style={{ padding: '40px', background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('Gym not found.')}</div>;

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
                        overflow-x: auto;
                        white-space: nowrap;
                        gap: 12px;
                        margin-bottom: 16px;
                        padding-bottom: 8px;
                        -webkit-overflow-scrolling: touch;
                    }
                    /* Remove scrollbar visual if desired, but keeping it is safer for discovery */
                    .dashboard-sidebar nav::-webkit-scrollbar {
                        height: 4px;
                    }
                    .dashboard-sidebar nav::-webkit-scrollbar-thumb {
                        background: #333;
                        border-radius: 4px;
                    }

                    .dashboard-sidebar nav button {
                        width: auto !important;
                        flex: 0 0 auto !important;
                        padding: 8px 16px !important;
                        border-radius: 100px !important;
                        border: 1px solid #333 !important;
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
                    <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('Admin Panel')}</div>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>{gym.name}</h1>
                    {gym.is_verified && <div style={{ display: 'inline-block', marginTop: '8px', background: '#FFC800', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>{t('VERIFIED PARTNER')}</div>}
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <NavBtn label={t("Overview")} icon="📊" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                    <NavBtn label={t("Analytics")} icon="📈" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
                    <NavBtn label={t("Broadcasts")} icon="📣" active={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')} />
                    <NavBtn label={t("TV Content")} icon="📺" active={activeTab === 'content'} onClick={() => setActiveTab('content')} />
                    <NavBtn label={t("Operations")} icon="⚡" active={activeTab === 'operations'} onClick={() => setActiveTab('operations')} />
                    <NavBtn label={t("Members")} icon="👥" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
                    <NavBtn label={t("Invitations")} icon="📩" active={activeTab === 'invites'} onClick={() => setActiveTab('invites')} />
                    <NavBtn label={t("Settings")} icon="⚙️" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                </nav>

                <div style={{ marginTop: 'auto' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', textDecoration: 'none', padding: '12px', borderRadius: '8px', transition: '0.2s' }}>
                        <span>←</span> {t('Back to App')}
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-content" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

                {activeTab === 'analytics' && <AnalyticsTab members={members} gym={gym} setActiveTab={setActiveTab} setBroadcastStartAudience={setBroadcastStartAudience} />}

                {activeTab === 'broadcast' && <BroadcastTab members={members} gym={gym} supabase={supabase} initialAudience={broadcastStartAudience} />}

                {activeTab === 'overview' && (
                    <OverviewTab
                        gym={gym}
                        members={members}
                        stats={stats}
                        contentData={contentData}
                        monitors={monitors}
                        setActiveTab={setActiveTab}
                    />
                )}

                {activeTab === 'content' && (
                    <TvContentTab
                        gymId={gymId}
                        tvSettings={tvSettings}
                        toggleTvFeature={toggleTvFeature}
                        handleDurationChange={handleDurationChange}
                        contentData={contentData}
                        handleAddNews={handleAddNews}
                        handleEditNews={handleEditNews}
                        handleDeleteContent={handleDeleteContent}
                        handleEditEvent={handleEditEvent}
                        handleEditChallenge={handleEditChallenge}
                        setInputModal={setInputModal}
                        fetchTvContent={fetchTvContent}
                        supabase={supabase}
                    />
                )}

                {activeTab === 'operations' && (
                    <OperationsTab
                        stats={stats}
                        gym={gym}
                        origin={origin}
                        connectingTv={connectingTv}
                        handleLinkTv={handleLinkTv}
                        monitors={monitors}
                        handleDisconnectMonitor={handleDisconnectMonitor}
                        regenerateKey={regenerateKey}
                        community={community}
                        handleCreateCommunity={handleCreateCommunity}
                    />
                )}

                {activeTab === 'members' && (
                    <MembersTab
                        members={members}
                        setManageModal={setManageModal}
                    />
                )}

                {activeTab === 'invites' && (
                    <InvitesTab
                        handleCreateInvite={handleCreateInvite}
                        invites={invites}
                        handleDeleteInvite={handleDeleteInvite}
                    />
                )}

                {activeTab === 'settings' && (
                    <SettingsTab gym={gym} />
                )}
            </main>

            {/* Modals */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDangerous={confirmModal.isDangerous}
                onConfirm={confirmModal.onConfirm}
                onCancel={confirmModal.onCancel}
            />

            <InputModal
                isOpen={inputModal.isOpen}
                title={inputModal.title}
                fields={inputModal.fields}
                confirmText={inputModal.confirmText}
                onConfirm={inputModal.onConfirm}
                onCancel={inputModal.onCancel}
            />

            {/* Manage Member Modal */}
            {manageModal.isOpen && manageModal.member && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setManageModal({ isOpen: false, member: null })}>
                    <div style={{ background: '#111', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>{t('Manage')} {manageModal.member.name}</h3>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '12px', color: '#888', fontSize: '0.9rem' }}>{t('Assign Role')}</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {['member', 'trainer', 'admin'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => handleUpdateRole(manageModal.member.id, r)}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: '8px', border: manageModal.member.role === r ? '1px solid #FFC800' : '1px solid #333',
                                            background: manageModal.member.role === r ? '#332b00' : '#222',
                                            color: manageModal.member.role === r ? '#FFC800' : '#fff', cursor: 'pointer', textTransform: 'capitalize', fontWeight: 'bold'
                                        }}
                                    >
                                        {t(r)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid #333', paddingTop: '24px' }}>
                            <h4 style={{ color: '#ff4444', margin: '0 0 12px 0', fontSize: '1rem' }}>{t('Danger Zone')}</h4>
                            <button
                                onClick={() => handleKickMember(manageModal.member.id)}
                                style={{ width: '100%', padding: '12px', background: '#300', color: '#f88', border: '1px solid #ff4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {t('Remove from Gym')}
                            </button>
                        </div>

                        <button
                            onClick={() => setManageModal({ isOpen: false, member: null })}
                            style={{ width: '100%', padding: '12px', background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', marginTop: '16px' }}
                        >
                            {t('Cancel')}
                        </button>
                    </div>
                </div>
            )}
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
