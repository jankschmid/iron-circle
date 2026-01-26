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
            // Fetch both friend requests and workout invites
            const [friendRequests, workoutInvites] = await Promise.all([
                // Friend requests
                (async () => {
                    const { data: friendshipData, error: friendshipError } = await supabase
                        .from('friendships')
                        .select('id, user_id, created_at')
                        .eq('friend_id', user.id)
                        .eq('status', 'pending');

                    if (friendshipError) throw friendshipError;
                    if (!friendshipData || friendshipData.length === 0) return [];

                    const senderIds = friendshipData.map(f => f.user_id);
                    const { data: profilesData } = await supabase
                        .from('profiles')
                        .select('id, name, username, avatar_url')
                        .in('id', senderIds);

                    return friendshipData.map(f => {
                        const senderProfile = profilesData?.find(p => p.id === f.user_id);
                        return {
                            ...f,
                            type: 'friend_request',
                            sender: senderProfile || { name: 'Unknown', username: 'unknown', avatar_url: null }
                        };
                    });
                })(),
                // Workout invites
                (async () => {
                    const { data: notifData, error: notifError } = await supabase
                        .from('notifications')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('type', 'workout_invite')
                        .eq('read', false)
                        .order('created_at', { ascending: false });

                    if (notifError) throw notifError;
                    if (!notifData || notifData.length === 0) return [];

                    const inviterIds = notifData.map(n => n.data?.inviterId).filter(Boolean);
                    const { data: profilesData } = await supabase
                        .from('profiles')
                        .select('id, name, username, avatar_url')
                        .in('id', inviterIds);

                    return notifData.map(n => {
                        const senderProfile = profilesData?.find(p => p.id === n.data?.inviterId);
                        return {
                            ...n,
                            type: 'workout_invite',
                            sender: senderProfile || { name: 'Unknown', username: 'unknown', avatar_url: null }
                        };
                    });
                })()
            ]);

            // Combine and sort by created_at
            const combined = [...friendRequests, ...workoutInvites].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );

            setRequests(combined);
        } catch (err) {
            console.error("Error fetching requests:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (request, action) => {
        if (request.type === 'friend_request') {
            if (action === 'accept') {
                const { error } = await supabase
                    .from('friendships')
                    .update({ status: 'accepted' })
                    .eq('id', request.id);

                if (!error) {
                    setRequests(prev => prev.filter(r => r.id !== request.id));
                    router.refresh();
                }
            } else if (action === 'decline') {
                const { error } = await supabase
                    .from('friendships')
                    .delete()
                    .eq('id', request.id);

                if (!error) {
                    setRequests(prev => prev.filter(r => r.id !== request.id));
                }
            }
        } else if (request.type === 'workout_invite') {
            if (action === 'join') {
                // Mark notification as read
                await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('id', request.id);

                // Navigate to tracker - joinSession will be called there
                router.push(`/tracker?join=${request.data.groupId}&gym=${request.data.gymId}`);
                setRequests(prev => prev.filter(r => r.id !== request.id));
            } else if (action === 'decline') {
                // Mark as read
                const { error } = await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('id', request.id);

                if (!error) {
                    setRequests(prev => prev.filter(r => r.id !== request.id));
                }
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
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {req.type === 'friend_request'
                                        ? `@${req.sender.username} • sent a friend request`
                                        : `@${req.sender.username} • invited you to workout at ${req.data?.gymName || 'the gym'}`
                                    }
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                    {req.type === 'friend_request' ? (
                                        <>
                                            <button
                                                onClick={() => handleAction(req, 'accept')}
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
                                                onClick={() => handleAction(req, 'decline')}
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
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleAction(req, 'join')}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    background: 'var(--brand-yellow)',
                                                    color: '#000',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🏋️ Join Workout
                                            </button>
                                            <button
                                                onClick={() => handleAction(req, 'decline')}
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
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
