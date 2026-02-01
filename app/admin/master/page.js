"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import GymEditorModal from '@/components/GymEditorModal';

export default function MasterAdminPage() {
    const { user } = useStore();
    // Fix: Singleton client
    const [supabase] = useState(() => createClient());
    const router = useRouter();

    const [stats, setStats] = useState(null);
    const [gyms, setGyms] = useState([]);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingGym, setEditingGym] = useState(null); // null = create mode

    // Auth Check
    useEffect(() => {
        // Simple client-side check, mostly relying on RLS server-side
        if (user && !user.is_super_admin) {
            // Optional: Fetch fresh profile to double check
        }
    }, [user]);

    // Initial Data Fetch
    useEffect(() => {
        if (!user) return;
        fetchStats();
        fetchGyms();
    }, [user]);

    const fetchStats = async () => {
        // Fallback stats if RPC fails
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: gymsCount } = await supabase.from('gyms').select('*', { count: 'exact', head: true });

        setStats({
            total_users: usersCount || 0,
            active_gyms: gymsCount || 0
        });
    };

    const fetchGyms = async () => {
        const { data, error } = await supabase
            .from('gyms')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) console.error("Fetch Gyms Error:", JSON.stringify(error, null, 2), error.message);
        if (data) setGyms(data);
    };

    const handleSearchUsers = async (e) => {
        e.preventDefault();
        const { data } = await supabase.from('profiles').select('*').ilike('name', `%${searchQuery}%`).limit(20);
        if (data) setUsers(data);
    };

    const toggleVerification = async (gymId, currentStatus) => {
        const { error } = await supabase
            .from('gyms')
            .update({ is_verified: !currentStatus })
            .eq('id', gymId);

        if (!error) {
            setGyms(prev => prev.map(g => g.id === gymId ? { ...g, is_verified: !currentStatus } : g));
        } else {
            alert("Verification Update Failed: " + error.message);
        }
    };

    const handleDeleteGym = async (gymId) => {
        if (!confirm("⚠️ DELETE GYM?\nThis allows DELETE. If it fails, check RLS or FK constraints.\nContinue?")) return;

        // Cascade manually if needed, but 'on delete cascade' in DB is better.
        // Assuming 'gyms' is the parent.
        const { error } = await supabase.from('gyms').delete().eq('id', gymId);

        if (error) {
            console.error("Delete Failed:", error);
            alert(`Delete failed: ${error.message}\n(Hint: Check 'gym_owners' policies if enabled)`);
        } else {
            setGyms(prev => prev.filter(g => g.id !== gymId));
            alert("Gym Deleted.");
        }
    };

    // Modal Handlers
    const openCreateModal = () => {
        setEditingGym(null);
        setShowModal(true);
    };

    const openEditModal = (gym) => {
        setEditingGym(gym);
        setShowModal(true);
    };

    const handleSaveGym = async (gymData) => {
        if (gymData.id) {
            // Update
            const { error } = await supabase
                .from('gyms')
                .update({
                    name: gymData.name,
                    address: gymData.address,
                    location: gymData.location
                })
                .eq('id', gymData.id);

            if (error) {
                alert("Update failed: " + error.message);
            } else {
                setGyms(prev => prev.map(g => g.id === gymData.id ? { ...g, ...gymData } : g));
                setShowModal(false);
            }
        } else {
            // Create
            const { data, error } = await supabase
                .from('gyms')
                .insert({
                    name: gymData.name,
                    address: gymData.address,
                    location: gymData.location,
                    is_verified: true, // Partner gyms default to verified
                    created_by: user.id,
                    display_key: Math.random().toString(36).substring(2, 8).toUpperCase()
                })
                .select()
                .single();

            if (error) {
                alert("Create failed: " + error.message);
            } else {
                // 2. Create associated Community
                const { error: commError } = await supabase
                    .from('communities')
                    .insert({
                        gym_id: data.id,
                        name: data.name,
                        description: `Official Community for ${data.name}`,
                        privacy: 'public', // or whatever default
                        gym_type: 'verified_partner'
                    });

                if (commError) console.error("Community Create Failed:", commError);

                setGyms(prev => [data, ...prev]);
                setShowModal(false);
                alert(`Gym Created!\nDisplay Key: ${data.display_key}\nCommunity Auto-created.`);
            }
        }
    };

    if (!user) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Admin Panel...</div>;

    return (
        <div style={{ minHeight: '100vh', background: '#111', color: '#fff', fontFamily: 'Inter' }}>
            <style jsx global>{`
                @media (max-width: 768px) {
                    .admin-container {
                        padding: 20px 16px !important;
                    }
                    .admin-header {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 16px;
                    }
                }
            `}</style>
            <div className="admin-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
                <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>MASTER <span style={{ color: '#FFC800' }}>ADMIN</span></h1>
                    <div style={{ color: '#666' }}>Logged as: {user.email || user.name}</div>
                </header>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '60px' }}>
                    <div style={{ background: '#222', padding: '24px', borderRadius: '16px' }}>
                        <div style={{ color: '#888', marginBottom: '8px' }}>Total Users</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats?.total_users || 0}</div>
                    </div>
                    <div style={{ background: '#222', padding: '24px', borderRadius: '16px' }}>
                        <div style={{ color: '#888', marginBottom: '8px' }}>Active Gyms</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats?.active_gyms || 0}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px' }}>
                    {/* Gym Management */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Partner Gyms</h2>
                            <button
                                onClick={openCreateModal}
                                style={{ background: '#FFC800', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                + New Partner Gym
                            </button>
                        </div>

                        <div style={{ background: '#222', borderRadius: '16px', overflow: 'hidden', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ background: '#333', textAlign: 'left' }}>
                                        <th style={{ padding: '16px' }}>Name</th>
                                        <th style={{ padding: '16px' }}>Location</th>
                                        <th style={{ padding: '16px' }}>Key</th>
                                        <th style={{ padding: '16px' }}>Status</th>
                                        <th style={{ padding: '16px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gyms.map(gym => (
                                        <tr key={gym.id} style={{ borderBottom: '1px solid #333' }}>
                                            <td style={{ padding: '16px', fontWeight: 'bold' }}>{gym.name}</td>
                                            <td style={{ padding: '16px', color: '#888' }}>{gym.address}</td>
                                            <td style={{ padding: '16px', fontFamily: 'monospace' }}>{gym.display_key || '-'}</td>
                                            <td style={{ padding: '16px' }}>
                                                {gym.is_verified ? (
                                                    <span style={{ color: '#000', background: '#FFC800', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>VERIFIED</span>
                                                ) : (
                                                    <span style={{ color: '#aaa', background: '#444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Community</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', display: 'flex', gap: '8px' }}>
                                                <a
                                                    href={`/gym/admin?id=${gym.id}`}
                                                    target="_blank"
                                                    style={{ background: '#333', color: '#fff', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '0.8rem', border: '1px solid #555' }}
                                                >
                                                    Dashboard
                                                </a>
                                                <button
                                                    onClick={() => openEditModal(gym)}
                                                    style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => toggleVerification(gym.id, gym.is_verified)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid #555',
                                                        color: gym.is_verified ? '#aaa' : '#fff',
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    {gym.is_verified ? 'Unverify' : 'Verify'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteGym(gym.id)}
                                                    style={{ background: '#4a0000', color: '#ffaaaa', border: '1px solid #ff0000', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {showModal && (
                    <GymEditorModal
                        gym={editingGym}
                        onClose={() => setShowModal(false)}
                        onSave={handleSaveGym}
                    />
                )}
            </div>
        </div>
    );
}
