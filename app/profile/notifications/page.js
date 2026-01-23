"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
    const { user } = useStore();
    const supabase = createClient();
    const router = useRouter();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchRequests();
    }, [user]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Step 1: Fetch pending friendship records where I am the recipient
            const { data: friendshipData, error: friendshipError } = await supabase
                .from('friendships')
                .select('id, user_id, created_at')
                .eq('friend_id', user.id)
                .eq('status', 'pending');

            if (friendshipError) throw friendshipError;

            if (!friendshipData || friendshipData.length === 0) {
                setRequests([]);
                setLoading(false);
                return;
            }

            // Step 2: Fetch profiles for the senders (user_id)
            const senderIds = friendshipData.map(f => f.user_id);
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, name, username, avatar_url')
                .in('id', senderIds);

            if (profilesError) throw profilesError;

            // Combine data: Map profile to friendship
            const combined = friendshipData.map(f => {
                const senderProfile = profilesData.find(p => p.id === f.user_id);
                return {
                    ...f,
                    sender: senderProfile || { name: 'Unknown', username: 'unknown', avatar_url: null }
                };
            });

            setRequests(combined);
        } catch (err) {
            console.error("Error fetching requests:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId, action) => {
        if (action === 'accept') {
            const { error } = await supabase
                .from('friendships')
                .update({ status: 'accepted' })
                .eq('id', requestId);

            if (!error) {
                // Remove from list
                setRequests(prev => prev.filter(r => r.id !== requestId));
                router.refresh(); // Refresh to update friend list eventually
            }
        } else if (action === 'decline') {
            const { error } = await supabase
                .from('friendships')
                .delete()
                .eq('id', requestId);

            if (!error) {
                setRequests(prev => prev.filter(r => r.id !== requestId));
            }
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/profile" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>Notifications</h1>
            </header>

            {loading ? (
                <div>Loading...</div>
            ) : requests.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                    No new notifications.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {requests.map(req => (
                        <div key={req.id} style={{
                            background: 'var(--surface)',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            gap: '12px'
                        }}>
                            <img
                                src={req.sender.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.sender.id}`}
                                style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600' }}>{req.sender.name || req.sender.username}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{req.sender.username} • sent a friend request</div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                    <button
                                        onClick={() => handleAction(req.id, 'accept')}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: 'var(--primary)',
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, 'decline')}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: 'var(--surface-highlight)',
                                            color: 'var(--text-dim)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
