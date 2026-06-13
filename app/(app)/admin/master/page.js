"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import GymEditorModal from '@/components/GymEditorModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import MissionControlComponent from '../missions/page';
import TranslationsAdminComponent from '../translations/page';
import GlobalExercisesAdminPage from '../exercises/page';

export default function MasterAdminPage() {
    const { user } = useStore();
    // Fix: Singleton client
    const [supabase] = useState(() => createClient());
    const router = useRouter();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState('analytics');
    const [gyms, setGyms] = useState([]);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ total_users: 0, active_gyms: 0 });

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 12;

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingGym, setEditingGym] = useState(null); // null = create mode
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });
    const [handoverCode, setHandoverCode] = useState(null);

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
                // RPC returns a TABLE, so data is an array: [{ data: ..., total: ... }]
                const result = Array.isArray(data) ? data[0] : data;
                setGyms(result?.data || []);
                setTotalCount(result?.total || 0);
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
            toast.error("Verification Update Failed: " + error.message);
        }
    };

    const handleDeleteGym = async (gymId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Gym?',
            message: 'Are you sure you want to delete this gym? This action cannot be undone.',
            isDangerous: true,
            confirmText: 'Delete',
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                const { error } = await supabase.from('gyms').delete().eq('id', gymId);

                if (error) {
                    console.error("Delete Failed:", error);
                    toast.error(`Delete failed: ${error.message}\n(Hint: Check 'gym_owners' policies if enabled)`);
                } else {
                    setGyms(prev => prev.filter(g => g.id !== gymId));
                    toast.success("Gym Deleted.");
                }
            },
            onCancel: () => setConfirmModal({ isOpen: false })
        });
    };

    const handleHandover = async (gymId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Generate Handover Code?',
            message: 'This will generate an emergency 24h handover code. Share this with the new Gym Admin.',
            confirmText: 'Generate',
            onConfirm: async () => {
                setConfirmModal({ isOpen: false });
                const { data, error } = await supabase.rpc('request_gym_handover', { p_gym_id: gymId });

                if (error) {
                    toast.error("Error: " + error.message);
                } else if (data.success) {
                    setHandoverCode(data.code);
                } else {
                    toast.error("Failed: " + data.message);
                }
            },
            onCancel: () => setConfirmModal({ isOpen: false })
        });
    };

    const handleSupportLogin = async (gymId) => {
        // Implement support login logic
        // Write to support_audit_logs, then navigate to portal
        try {
            const { error } = await supabase.from('support_audit_logs').insert({
                gym_id: gymId,
                admin_id: user.id,
                action_performed: 'Initiated Support Session'
            });

            if (error) {
                toast.error("Audit Log Failed: " + error.message);
                return;
            }
            
            // Set session storage flag to simulate support mode
            sessionStorage.setItem('support_impersonation_gym_id', gymId);
            
            // Navigate directly to the portal
            router.push(`/gym/admin?id=${gymId}`);
        } catch (err) {
            toast.error("Support Login Error: " + err.message);
        }
    };

    // Analytics CSV Export Handlers
    const downloadCSV = (data, filename) => {
        if (!data || data.length === 0) {
            toast.error("No data available to export.");
            return;
        }
        const headers = Object.keys(data[0]);
        const csvRows = [];
        csvRows.push(headers.join(','));

        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header] === null || row[header] === undefined ? '' : row[header];
                const escaped = ('' + val).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportActivity = async () => {
        const { data, error } = await supabase.rpc('export_analytics_activity', {
            p_start_date: startDate ? new Date(startDate).toISOString() : null,
            p_end_date: endDate ? new Date(endDate).toISOString() : null
        });
        if (error) return toast.error("Export A Failed: " + error.message);
        downloadCSV(data, `Export_A_Activity_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleExportGamification = async () => {
        const { data, error } = await supabase.rpc('export_analytics_gamification', {
            p_start_date: startDate ? new Date(startDate).toISOString() : null,
            p_end_date: endDate ? new Date(endDate).toISOString() : null
        });
        if (error) return toast.error("Export B Failed: " + error.message);
        downloadCSV(data, `Export_B_Gamification_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleExportSocial = async () => {
        const { data, error } = await supabase.rpc('export_analytics_social', {
            p_start_date: startDate ? new Date(startDate).toISOString() : null,
            p_end_date: endDate ? new Date(endDate).toISOString() : null
        });
        if (error) return toast.error("Export C Failed: " + error.message);
        downloadCSV(data, `Export_C_Social_${new Date().toISOString().split('T')[0]}.csv`);
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
                    location: gymData.location,
                    radius: gymData.radius
                })
                .eq('id', gymData.id);

            if (error) {
                toast.error("Update failed: " + error.message);
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
                    radius: gymData.radius,
                    is_verified: true, // Partner gyms default to verified
                    created_by: user.id,
                    display_key: Math.random().toString(36).substring(2, 8).toUpperCase()
                })
                .select()
                .single();

            if (error) {
                toast.error("Create failed: " + error.message);
            } else {
                // 2. Create associated Community
                const { error: commError } = await supabase
                    .from('communities')
                    .insert({
                        gym_id: data.id,
                        name: data.name,
                        description: `Official Community for ${data.name}`,
                        created_by: user.id
                    });

                if (commError) {
                    console.error("Community Create Failed:", commError);
                    toast.error("Community Create Failed: " + commError.message);
                }

                // 3. Generate Initial Handover Code
                const { data: handoverData } = await supabase.rpc('request_gym_handover', { p_gym_id: data.id });
                const codeMsg = handoverData?.success ? "\n\n🔑 HANDOVER CODE: " + handoverData.code : "\n(Could not generate handover code)";

                setGyms(prev => [data, ...prev]);
                setShowModal(false);

                toast.success(`Gym Created Successfully!`);
                if (handoverData?.success) {
                    setHandoverCode(handoverData.code);
                }
            }
        }
    };

    if (!user) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Admin Panel...</div>;

    return (
        <div style={{ width: '100%', minWidth: 0, minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'Inter' }}>
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
                {/* HERO SECTION */}
                <div style={{ position: 'relative', height: '28vh', overflow: 'hidden' }}>
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                    }} />
                    {/* Gradient Overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), #050505)' }} />

                    <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '16px',
                                    background: 'linear-gradient(45deg, #FFC800, #FFA500)',
                                    border: '2px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'
                                }}>
                                    <img src="/assets/logo/Iron-Circle_Logo_Two_Color.svg" alt="IronCircle Logo" style={{ width: '32px', height: '32px' }} />
                                </div>
                                <div style={{ marginBottom: '4px' }}>
                                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '-0.5px' }}>
                                        IRON<span style={{ color: '#FFC800' }}>CIRCLE</span>
                                    </h1>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                        <span style={{
                                            background: 'rgba(255, 200, 0, 0.2)', color: '#FFC800', border: '1px solid rgba(255, 200, 0, 0.3)',
                                            padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold'
                                        }}>Master Control</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    onClick={() => router.push('/')}
                                    style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    🌍 Back to Website
                                </button>
                                <button 
                                    onClick={() => router.push('/dashboard')}
                                    style={{ background: '#FFC800', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    📱 Go to App
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div style={{ display: 'flex', borderBottom: '1px solid #222', padding: '0 20px', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(10px)', overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    {[
                        { id: 'analytics', label: '📈 Analytics' },
                        { id: 'gyms', label: '🏢 Partner Gyms' },
                        { id: 'exercises', label: '🏋️ Global Exercises' },
                        { id: 'missions', label: '🚀 Mission Control' },
                        { id: 'translations', label: '🌍 Translations' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setCurrentPage(0); setSearchQuery(''); }}
                            style={{
                                flexShrink: 0, padding: '16px', background: 'transparent', border: 'none',
                                color: activeTab === tab.id ? '#FFC800' : '#888',
                                fontWeight: activeTab === tab.id ? '900' : '600',
                                borderBottom: activeTab === tab.id ? '2px solid #FFC800' : '2px solid transparent',
                                textTransform: 'uppercase', cursor: 'pointer', fontSize: '0.85rem', letterSpacing: '0.5px'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* CONTENT AREA */}
                <div style={{ padding: '40px 20px', width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>
                    <div style={{ width: '100%', minWidth: 0 }}>
                    {/* Dynamic View based on Tab */}
                    {activeTab === 'analytics' && (
                        <div>
                            {/* High-Level Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                                <div style={{ background: '#222', padding: '24px', borderRadius: '16px' }}>
                                    <div style={{ color: '#888', marginBottom: '8px' }}>Total Users</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats?.total_users || 0}</div>
                                </div>
                                <div style={{ background: '#222', padding: '24px', borderRadius: '16px' }}>
                                    <div style={{ color: '#888', marginBottom: '8px' }}>Active Gyms</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats?.active_gyms || 0}</div>
                                </div>
                            </div>

                            {/* Analytics & Export (The Black Box) */}
                            <div style={{ marginBottom: '60px' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px', color: '#fff' }}>Analytics & Export (The Black Box) 📉</h2>
                                <div style={{ background: '#222', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px' }}>Download raw user progression and retention data as standard CSV to analyze in Excel or Google Sheets.</p>
                                    
                                    {/* Date Range Filter */}
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold' }}>Start Date (Optional)</label>
                                            <input 
                                                type="date" 
                                                value={startDate} 
                                                onChange={e => setStartDate(e.target.value)} 
                                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #444', background: '#111', color: '#fff', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold' }}>End Date (Optional)</label>
                                            <input 
                                                type="date" 
                                                value={endDate} 
                                                onChange={e => setEndDate(e.target.value)} 
                                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #444', background: '#111', color: '#fff', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                        <div style={{ alignSelf: 'flex-end', color: '#666', fontSize: '0.8rem', paddingBottom: '10px' }}>
                                            *Defaults to current month if empty.
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                        <button
                                            onClick={handleExportActivity}
                                            style={{
                                                background: '#333', color: '#fff', border: '1px solid #444', padding: '16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', transition: 'background 0.2s'
                                            }}
                                        >
                                            <span>📥 Export A: Activity (Retention)</span>
                                        </button>
                                        <button
                                            onClick={handleExportGamification}
                                            style={{
                                                background: '#333', color: '#fff', border: '1px solid #444', padding: '16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', transition: 'background 0.2s'
                                            }}
                                        >
                                            <span>📥 Export B: Gamification (Hook)</span>
                                        </button>
                                        <button
                                            onClick={handleExportSocial}
                                            style={{
                                                background: '#333', color: '#fff', border: '1px solid #444', padding: '16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', transition: 'background 0.2s'
                                            }}
                                        >
                                            <span>📥 Export C: Social (Virality)</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gym Management */}
                    {activeTab === 'gyms' && (
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

                                                {gym.support_access_active && new Date(gym.support_expires_at) > new Date() ? (
                                                    <button
                                                        onClick={() => handleSupportLogin(gym.id)}
                                                        style={{ background: '#002244', color: '#00aaff', border: '1px solid #00aaff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        🛠️ Support Login
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        style={{ background: 'transparent', color: '#444', border: '1px solid #333', padding: '6px 12px', borderRadius: '6px', cursor: 'not-allowed', fontSize: '0.8rem' }}
                                                    >
                                                        🔒 No Access
                                                    </button>
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
                )}

                {activeTab === 'missions' && <MissionControlComponent />}
                {activeTab === 'translations' && <TranslationsAdminComponent />}
                {activeTab === 'exercises' && <GlobalExercisesAdminPage />}
                </div>

                {showModal && (
                    <GymEditorModal
                        gym={editingGym}
                        onClose={() => setShowModal(false)}
                        onSave={handleSaveGym}
                    />
                )}

                {/* Confirmation Modal */}
                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText={confirmModal.confirmText}
                    isDangerous={confirmModal.isDangerous}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={confirmModal.onCancel}
                />

                {/* Handover Code Modal */}
                {handoverCode && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '20px' }}>
                        <div style={{ background: '#111', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '100%', border: '1px solid #333', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>??</div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#fff' }}>Handover Code Generated</h2>
                            <p style={{ color: '#888', marginBottom: '24px', fontSize: '0.9rem' }}>
                                Share this exact code with the Studio Admin. They can enter it at <strong>/claim</strong>. The code expires in 24 hours.
                            </p>
                            <div style={{ background: '#000', padding: '16px', borderRadius: '8px', border: '1px solid #444', marginBottom: '24px', userSelect: 'all' }}>
                                <code style={{ fontSize: '1.5rem', color: '#FFC800', fontWeight: 'bold' }}>{handoverCode}</code>
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(handoverCode);
                                        toast.success("Code copied to clipboard!");
                                    }}
                                    style={{ flex: 1, padding: '12px', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Copy Code
                                </button>
                                <button
                                    onClick={() => setHandoverCode(null)}
                                    style={{ flex: 1, padding: '12px', background: '#FFC800', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
