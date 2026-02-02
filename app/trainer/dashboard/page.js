"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function TrainerDashboard() {
    const { user } = useStore();
    const [clients, setClients] = useState([]);
    const [activeTab, setActiveTab] = useState('clients'); // clients, invites
    const [inviteLink, setInviteLink] = useState(null);
    const [trainerCode, setTrainerCode] = useState(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        if (!user) return;
        fetchClients();
        fetchTrainerCode();
    }, [user]);

    const fetchClients = async () => {
        const { data, error } = await supabase
            .from('trainer_relationships')
            .select(`
                *,
                client:profiles!client_id (*)
            `)
            .eq('trainer_id', user.id)
            .eq('status', 'active');

        if (data) setClients(data);
    };

    const fetchTrainerCode = async () => {
        const { data, error } = await supabase.rpc('get_my_trainer_code');
        if (data) setTrainerCode(data);
    };

    const handleGenerateInvite = () => {
        // Simple invite: ?trainer_ref=USER_ID
        const link = `${window.location.origin}/connect?trainer=${user.id}`;
        setInviteLink(link);
    };

    const handleSearch = async () => {
        if (!searchQuery || searchQuery.length < 3) return;
        setIsSearching(true);
        try {
            const { data, error } = await supabase.rpc('search_profiles_secure', { p_query: searchQuery });
            if (data) setSearchResults(data);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddClient = async (clientId) => {
        const { data, error } = await supabase.rpc('invite_client_by_id', { client_id: clientId });
        if (data?.success) {
            alert("Invite sent!"); // Ideally replace with Toast
            // Remove from list or mark as invited?
            setSearchResults(prev => prev.map(p => p.id === clientId ? { ...p, is_client: true } : p));
        } else {
            alert("Error: " + (data?.message || error?.message));
        }
    };

    return (
        <div className="container" style={{ padding: '20px' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
                <button
                    onClick={() => setActiveTab('clients')}
                    style={{
                        padding: '12px 0',
                        color: activeTab === 'clients' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'clients' ? '2px solid var(--primary)' : '2px solid transparent',
                        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                        background: 'none', cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    My Athletes ({clients.length})
                </button>
                <button
                    onClick={() => setActiveTab('invites')}
                    style={{
                        padding: '12px 0',
                        color: activeTab === 'invites' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'invites' ? '2px solid var(--primary)' : '2px solid transparent',
                        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                        background: 'none', cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    Invite
                </button>
            </div>

            {/* Content */}
            {activeTab === 'invites' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Method 1: Trainer Code */}
                    <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--primary-dim)' }}>
                        <h2 style={{ fontSize: '1rem', marginBottom: '8px', color: 'var(--text-muted)' }}>YOUR TRAINER CODE</h2>
                        <div style={{
                            fontSize: '2.5rem', fontWeight: '900', letterSpacing: '2px',
                            color: 'var(--primary)', marginBottom: '8px', fontFamily: 'monospace'
                        }}>
                            {trainerCode || '...'}
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                            Tell your clients to enter this code in their settings.
                        </p>
                    </div>

                    {/* Method 2: Direct Search */}
                    <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Direct Invite</h2>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input
                                placeholder="Search by name or handle..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '8px',
                                    background: 'var(--background)', border: '1px solid var(--border)',
                                    color: 'var(--text-main)'
                                }}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={isSearching}
                                style={{
                                    padding: '0 24px', borderRadius: '8px',
                                    background: 'var(--surface-highlight)', border: 'none',
                                    color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                {isSearching ? '...' : 'Search'}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: '8px' }}>
                            {searchResults.map(profile => (
                                <div key={profile.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px', background: 'var(--background)', borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <img src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                                            style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{profile.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{profile.username}</div>
                                        </div>
                                    </div>
                                    {profile.is_client ? (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px' }}>Added</span>
                                    ) : (
                                        <button
                                            onClick={() => handleAddClient(profile.id)}
                                            style={{
                                                padding: '8px 16px', borderRadius: '100px',
                                                background: 'var(--primary)', color: 'black', border: 'none',
                                                fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer'
                                            }}
                                        >
                                            Add +
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Method 3: Link */}
                    <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--text-muted)' }}>INVITE LINK</h2>
                        {!inviteLink ? (
                            <button
                                onClick={handleGenerateInvite}
                                style={{
                                    padding: '12px 24px',
                                    background: 'var(--surface-highlight)', color: 'var(--primary)',
                                    borderRadius: '100px', border: '1px solid var(--primary)', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                Generate Link
                            </button>
                        ) : (
                            <input
                                readOnly
                                value={inviteLink}
                                style={{
                                    width: '100%', padding: '12px',
                                    background: 'var(--background)', border: '1px solid var(--border)',
                                    borderRadius: '8px', color: 'var(--text-main)', textAlign: 'center'
                                }}
                            />
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'clients' && (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {clients.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No active clients yet.<br />Go to Invite tab to start.
                        </div>
                    ) : (
                        clients.map(rel => {
                            const client = rel.client;
                            return (
                                <Link
                                    key={rel.id}
                                    href={`/trainer/dashboard/client?id=${client.id}`}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '16px',
                                        padding: '16px',
                                        background: 'var(--surface)',
                                        borderRadius: '16px',
                                        textDecoration: 'none',
                                        color: 'inherit'
                                    }}
                                >
                                    <img
                                        src={client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.id}`}
                                        alt={client.name}
                                        style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{client.name || 'Unknown'}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Last Active: {new Date().toLocaleDateString()} {/* Mock for now */}
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)' }}>➜</div>
                                </Link>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
