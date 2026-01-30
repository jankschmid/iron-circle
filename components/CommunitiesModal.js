"use client";

import { useState } from 'react';

export default function CommunitiesModal({ onClose, fetchCommunities, joinCommunity, user, onSuccess }) {
    const [communities, setCommunities] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [joiningCommunity, setJoiningCommunity] = useState(null);
    const [consentModal, setConsentModal] = useState(null); // { communityId, gymId, gymName }

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length >= 2) {
            const results = await fetchCommunities(query);
            setCommunities(results);
        } else {
            setCommunities([]);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'var(--background)', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>🌐 Find Communities</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                </div>

                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                    <input type="text" placeholder="Search communities..." value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }} />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {communities.length === 0 && searchQuery === '' && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><p>Start typing to search for communities</p></div>
                    )}
                    {communities.length === 0 && searchQuery !== '' && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><p>No communities found</p></div>
                    )}
                    {communities.map(community => {
                        const isMember = user.gyms?.some(g => g.id === community.gym_id);
                        return (
                            <div key={community.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '4px' }}>{community.name}</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>📍 {community.gyms?.name || 'Unknown Gym'}</p>
                                        {community.description && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{community.description}</p>}
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>👥 {community.member_count} {community.member_count === 1 ? 'member' : 'members'}</div>
                                    </div>
                                    <button onClick={async () => {
                                        // Intercept for Permission Gate
                                        if (!isMember && community.gym_type === 'verified_partner') {
                                            setConsentModal({
                                                city: community.gyms?.name || community.name,
                                                communityId: community.id,
                                                gymName: community.gyms?.name,
                                                gymId: community.gym_id
                                            });
                                            return;
                                        }

                                        setJoiningCommunity(community.id);
                                        try {
                                            const result = await joinCommunity(community.id, community.gym_id, community.gyms?.name || community.name);
                                            onSuccess(result?.conversationId);
                                        } catch (err) {
                                            alert(`Failed to join: ${err.message}`);
                                        } finally {
                                            setJoiningCommunity(null);
                                        }
                                    }}
                                        disabled={joiningCommunity === community.id}
                                        style={{ padding: '8px 16px', background: isMember ? 'var(--surface-highlight)' : 'var(--primary)', color: isMember ? 'var(--text-main)' : '#000', border: isMember ? '1px solid var(--border)' : 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                        {joiningCommunity === community.id ? (isMember ? 'Opening...' : 'Joining...') : isMember ? 'Open Chat' : 'Join'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>


            {/* Permission Gate Modal */}
            {
                consentModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.9)', zIndex: 1100,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <div style={{
                            background: 'var(--surface)', borderRadius: '16px', padding: '24px',
                            maxWidth: '400px', width: '100%', border: '1px solid var(--border)',
                            color: 'var(--foreground)'
                        }}>
                            <h3 style={{ fontSize: '1.2rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🔒 Privacy Check
                            </h3>
                            <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-muted)', marginBottom: '24px' }}>
                                <strong>{consentModal.gymName}</strong> is a Verified Partner Gym using IronCircle Monitors.
                                <br /><br />
                                By joining, you agree that your <strong>Username</strong> and <strong>Current Workout</strong> will be displayed on the gym's screens while you are training here.
                            </p>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setConsentModal(null)}
                                    style={{
                                        padding: '12px 20px', background: 'transparent',
                                        color: 'var(--text-muted)', border: 'none', cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        const { communityId, gymId, gymName } = consentModal;
                                        setJoiningCommunity(communityId);
                                        setConsentModal(null);
                                        try {
                                            // Pass explicit consent flag
                                            const result = await joinCommunity(communityId, gymId, gymName, true);
                                            onSuccess(result?.conversationId);
                                        } catch (err) {
                                            alert("Failed to join: " + err.message);
                                        } finally {
                                            setJoiningCommunity(null);
                                            setConsentModal(null);
                                        }
                                    }}
                                    style={{
                                        padding: '12px 20px', background: 'var(--primary)',
                                        color: '#000', border: 'none', borderRadius: '8px',
                                        fontWeight: 'bold', cursor: 'pointer'
                                    }}
                                >
                                    Agree & Join
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
