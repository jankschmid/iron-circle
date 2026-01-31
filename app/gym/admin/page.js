"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

    // TV Linking State
    const [connectingTv, setConnectingTv] = useState(false);
    const [monitors, setMonitors] = useState([]); // List of connected TVs

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
        if (code.length < 6) return alert("Invalid Code");

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
                alert("Success! TV Connected.");
                input.value = '';
                fetchMonitors(); // Refresh list
            } else {
                alert("Code not found or expired.");
            }
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setConnectingTv(false);
        }
    };

    const handleDisconnectMonitor = async (monitorId) => {
        if (!confirm("Disconnect this screen? It will return to pairing mode.")) return;
        try {
            const { error } = await supabase.rpc('disconnect_gym_monitor', { p_monitor_id: monitorId });
            if (error) throw error;

            // Optimistic update
            setMonitors(prev => prev.filter(m => m.id !== monitorId));
            alert("Monitor Disconnected.");
            fetchMonitors(); // Verify with server
        } catch (err) {
            alert("Error: " + err.message);
        }
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
                alert("Access Denied: You are not the owner of this gym.");
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

        } catch (err) {
            console.error("Gym Admin Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMembers = async (commId, query = '') => {
        let q = supabase
            .from('community_members')
            .select('user_id, role, member_since, profiles(id, name, username, avatar_url, privacy_settings)')
            .eq('community_id', commId)
            .order('member_since', { ascending: false })
            .limit(1000); // Increased limit as requested to show "all"

        const { data } = await q;
        if (data) {
            // Map to cleaner objects
            setMembers(data.map(m => {
                const isPrivate = !m.profiles || m.profiles?.privacy_settings?.profile_visibility === 'private';
                return {
                    id: m.user_id,
                    ...m.profiles,
                    role: m.role,
                    joined: m.member_since,
                    isPrivate
                };
            }));
        }
    };

    const handleCreateCommunity = async () => {
        if (!confirm("Initialize Community for this gym?")) return;
        const { error } = await supabase.from('communities').insert({
            gym_id: gym.id,
            name: gym.name,
            description: `Official Community for ${gym.name}`,
            gym_type: 'verified_partner',
            privacy: 'public'
        });
        if (!error) {
            alert("Community Created. Refreshing...");
            fetchGymDetails();
        } else {
            alert("Error: " + error.message);
        }
    };

    // Auto-generate key if missing
    useEffect(() => {
        if (gym && !gym.display_key) {
            regenerateKey(true);
        }
    }, [gym]);

    const regenerateKey = async (silent = false) => {
        console.log("Regenerating Key for Gym:", gymId);
        if (!silent && !confirm("Are you sure? This will disconnect current displays.")) return;

        const newKey = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log("New Key Generated:", newKey);

        const { error } = await supabase
            .from('gyms')
            .update({ display_key: newKey })
            .eq('id', gymId);

        if (error) {
            console.error("Key Update Error:", error);
            if (!silent) alert("Failed to update key: " + error.message);
        } else {
            setGym(prev => ({ ...prev, display_key: newKey }));
            if (!silent) alert("New Key Generated: " + newKey);
        }
    };

    // --- Render Helpers ---

    if (!gymId) return <div style={{ padding: '40px', background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Gym ID missing.</div>;
    if (loading) return <div style={{ padding: '40px', background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Dashboard...</div>;
    if (!gym) return <div style={{ padding: '40px', background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Gym not found.</div>;

    return (
        <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex' }}>

            {/* Sidebar */}
            <aside style={{ width: '250px', borderRight: '1px solid #222', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Admin Panel</div>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>{gym.name}</h1>
                    {gym.is_verified && <div style={{ display: 'inline-block', marginTop: '8px', background: '#FFC800', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>VERIFIED PARTNER</div>}
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <NavBtn label="Overview" icon="📊" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
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
            <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

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

                        <div style={{ background: '#111', borderRadius: '12px', border: '1px solid #222', overflow: 'hidden' }}>
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
