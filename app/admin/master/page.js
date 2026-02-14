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

    // Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 12;

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
    }, [user]);

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(0); // Reset page on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch Gyms when Page or Search changes
    useEffect(() => {
        if (!user) return;
        fetchGyms();
    }, [user, currentPage, debouncedSearch]);

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
        try {
            const { data, error } = await supabase.rpc('get_admin_gyms_paginated', {
                p_page_size: pageSize,
                p_page: currentPage,
                p_search: debouncedSearch
            });

            if (error) {
                console.error("fetchGyms RPC Error:", error);
                throw error;
            }
            console.log("fetchGyms RPC Data:", data);

            if (data) {
                setGyms(data.data || []);
                setTotalCount(data.total || 0);
            }
        } catch (err) {
            console.error("Fetch Gyms Error:", err.message);
        }
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

    const handleHandover = async (gymId) => {
        if (!confirm("Generate Emergency Handover Code? This is only allowed because no admins exist.")) return;

        const { data, error } = await supabase.rpc('request_gym_handover', { p_gym_id: gymId });

        if (error) {
            alert("Error: " + error.message);
        } else if (data.success) {
            prompt("HANDOVER CODE GENERATED\n\nShare this code with the new Admin. It expires in 24h.\n\nCode:", data.code);
            fetchGyms(); // Refresh to see admin count update? No, count won't update until they join.
        } else {
            alert("Failed: " + data.message);
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

                // 3. Generate Initial Handover Code
                const { data: handoverData } = await supabase.rpc('request_gym_handover', { p_gym_id: data.id });
                const codeMsg = handoverData?.success ? "\n\n🔑 HANDOVER CODE: " + handoverData.code : "\n(Could not generate handover code)";

                setGyms(prev => [data, ...prev]);
                setShowModal(false);

                alert(`Gym Created Successfully!${codeMsg}\n\nShare this code with the Gym Manager immediately. You will not see it again.`);
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
                    
                    /* Responsive Table -> Cards */
                    .admin-table, .admin-table tbody, .admin-table tr, .admin-table td {
                        display: block;
                        width: 100%;
                    }
                    .admin-table {
                        min-width: 0 !important; /* Override inline style */
                    }
                    .admin-table thead {
                        display: none;
                    }
                    .admin-table tr {
                        margin-bottom: 16px;
                        border: 1px solid #333;
                        border-radius: 12px;
                        background: #222;
                        overflow: hidden;
                    }
                    .admin-table td {
                        padding: 12px 16px !important;
                        text-align: right;
                        border-bottom: 1px solid #333;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 0.9rem;
                    }
                    .admin-table td:last-child {
                        border-bottom: none;
                        justify-content: flex-end;
                        padding-top: 16px !important;
                    }
                    
                    /* Mobile Labels */
                    .admin-table td::before {
                        content: attr(data-label);
                        font-weight: bold;
                        color: #888;
                        text-transform: uppercase;
                        font-size: 0.7rem;
                        margin-right: 12px;
                    }
                    .admin-table td:last-child::before {
                        display: none;
                    }
                }
            `}</style>
            <div className="admin-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
                <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>MASTER <span style={{ color: '#FFC800' }}>ADMIN</span></h1>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <button
                            onClick={() => router.push('/admin/translations')}
                            style={{
                                background: '#222',
                                border: '1px solid #444',
                                color: '#fff',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            🌍 Languages & Translations
                        </button>
                        <div style={{ color: '#666' }}>Logged as: {user.email || user.name}</div>
                    </div>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Partner Gyms</h2>
                                <input
                                    placeholder="Search Gyms..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        padding: '8px 12px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff', width: '250px'
                                    }}
                                />
                            </div>
                            <button
                                onClick={openCreateModal}
                                style={{ background: '#FFC800', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                + New Partner Gym
                            </button>
                        </div>

                        <div style={{ background: '#222', borderRadius: '16px', overflow: 'hidden', overflowX: 'auto' }}>
                            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ background: '#333', textAlign: 'left' }}>
                                        <th style={{ padding: '16px' }}>Name</th>
                                        <th style={{ padding: '16px' }}>Location</th>
                                        <th style={{ padding: '16px' }}>Admins</th>
                                        <th style={{ padding: '16px' }}>Status</th>
                                        <th style={{ padding: '16px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gyms.map(gym => (
                                        <tr key={gym.id} style={{ borderBottom: '1px solid #333' }}>
                                            <td data-label="Name" style={{ padding: '16px', fontWeight: 'bold' }}>{gym.name}</td>
                                            <td data-label="Location" style={{ padding: '16px', color: '#888' }}>{gym.address}</td>
                                            <td data-label="Admins" style={{ padding: '16px' }}>
                                                {gym.admin_count > 0 ? (
                                                    <span style={{ color: '#0f0', fontWeight: 'bold' }}>Active ({gym.admin_count})</span>
                                                ) : (
                                                    <span style={{ color: '#f00', fontWeight: 'bold' }}>No Admin</span>
                                                )}
                                            </td>
                                            <td data-label="Status" style={{ padding: '16px' }}>
                                                {gym.is_verified ? (
                                                    <span style={{ color: '#000', background: '#FFC800', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>VERIFIED</span>
                                                ) : (
                                                    <span style={{ color: '#aaa', background: '#444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Community</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', display: 'flex', gap: '8px' }}>
                                                {gym.admin_count === 0 ? (
                                                    <button
                                                        onClick={() => handleHandover(gym.id)}
                                                        style={{ background: '#004400', color: '#0f0', border: '1px solid #0f0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        📲 Initialize Admin
                                                    </button>
                                                ) : (
                                                    <span style={{ color: '#444', padding: '6px', fontSize: '0.8rem', fontStyle: 'italic' }}>Managed</span>
                                                )}

                                                <button
                                                    onClick={() => openEditModal(gym)}
                                                    style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                >
                                                    ✏️
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

                        {/* Pagination Controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 8px', flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ color: '#888', fontSize: '0.9rem' }}>
                                Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    disabled={currentPage === 0}
                                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                    style={{
                                        padding: '8px 16px', background: currentPage === 0 ? '#222' : '#333',
                                        color: currentPage === 0 ? '#555' : '#fff', border: 'none', borderRadius: '8px', cursor: currentPage === 0 ? 'default' : 'pointer'
                                    }}
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={((currentPage + 1) * pageSize) >= totalCount}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    style={{
                                        padding: '8px 16px', background: ((currentPage + 1) * pageSize) >= totalCount ? '#222' : '#333',
                                        color: ((currentPage + 1) * pageSize) >= totalCount ? '#555' : '#fff', border: 'none', borderRadius: '8px', cursor: ((currentPage + 1) * pageSize) >= totalCount ? 'default' : 'pointer'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
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
