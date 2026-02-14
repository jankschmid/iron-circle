"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
    const { user, fetchFriends } = useStore();
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
            // Fetch both friend requests and notifications
            const [friendRequests, notifData] = await Promise.all([
                // Friend requests (Existing Logic)
                (async () => {
                    const { data, error } = await supabase
                        .from('friendships')
                        .select('id, user_id, created_at')
                        .eq('friend_id', user.id)
                        .eq('status', 'pending');
                    if (error) throw error;
                    return data || [];
                })(),
                // Notifications
                (async () => {
                    const { data, error } = await supabase
                        .from('notifications')
                        .select('*')
                        .eq('user_id', user.id)
                        .in('type', ['workout_invite', 'template_share', 'workout_share', 'trainer_invite']) // Added trainer_invite
                        .eq('read', false)
                        .order('created_at', { ascending: false });
                    if (error) throw error;
                    return data || [];
                })()
            ]);

            // Collect all user IDs to fetch profiles
            const senderIds = new Set();
            friendRequests.forEach(r => senderIds.add(r.user_id));
            if (notifData) {
                notifData.forEach(n => {
                    const id = n.data?.inviterId || n.data?.sharerId;
                    if (id) senderIds.add(id);
                });
            }

            // Fetch Profiles
            let profilesMap = {};
            if (senderIds.size > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name, username, avatar_url')
                    .in('id', Array.from(senderIds));

                if (profiles) {
                    profiles.forEach(p => profilesMap[p.id] = p);
                }
            }

            // Transform Types
            const formattedFriendRequests = friendRequests.map(f => ({
                ...f,
                type: 'friend_request',
                sender: profilesMap[f.user_id] || { name: 'Unknown', username: 'unknown', avatar_url: null }
            }));

            const formattedNotifs = (notifData || []).map(n => {
                const senderId = n.data?.inviterId || n.data?.sharerId;
                return {
                    ...n,
                    sender: profilesMap[senderId] || { name: 'Unknown', username: 'unknown', avatar_url: null }
                };
            });

            // Combine
            const combined = [...formattedFriendRequests, ...formattedNotifs].sort(
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
        // Universal Mark as Read for notifications
        if (request.type !== 'friend_request') {
            await supabase.from('notifications').update({ read: true }).eq('id', request.id);
        }

        if (request.type === 'friend_request') {
            if (action === 'accept') {
                await supabase.from('friendships').update({ status: 'accepted' }).eq('id', request.id);
                fetchFriends(); // Update store
            } else {
                await supabase.from('friendships').delete().eq('id', request.id);
            }
            setRequests(prev => prev.filter(r => r.id !== request.id));
        }
        else if (request.type === 'trainer_invite') {
            if (!request.sender?.id) {
                alert("This invitation is invalid or expired (missing sender details).");
                await supabase.from('notifications').delete().eq('id', request.id);
                setRequests(prev => prev.filter(r => r.id !== request.id));
                return;
            }

            if (action === 'accept') {
                const { error } = await supabase
                    .from('trainer_relationships')
                    .update({ status: 'active' })
                    .eq('trainer_id', request.sender.id)
                    .eq('client_id', user.id);

                if (error) {
                    console.error("Accept error:", error);
                    alert("Error accepting trainer: " + error.message);
                } else {
                    alert("Trainer accepted!");
                }
            } else {
                await supabase
                    .from('trainer_relationships')
                    .update({ status: 'rejected' })
                    .eq('trainer_id', request.sender.id)
                    .eq('client_id', user.id);
            }
            setRequests(prev => prev.filter(r => r.id !== request.id));
        }
        else if (request.type === 'workout_invite' && action === 'join') {
            router.push(`/tracker?join=${request.data.groupId}&gym=${request.data.gymId}`);
        }
        else {
            setRequests(prev => prev.filter(r => r.id !== request.id));
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
                                    {req.type === 'friend_request' && `@${req.sender.username} • sent a friend request`}
                                    {req.type === 'trainer_invite' && (
                                        <span>
                                            @{req.sender.username} • wants to be your Personal Trainer
                                            {req.data?.gymName && (
                                                <span style={{
                                                    display: 'inline-block',
                                                    marginLeft: '8px',
                                                    padding: '2px 8px',
                                                    background: 'var(--surface-highlight)',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    color: 'var(--brand-yellow)'
                                                }}>
                                                    📍 {req.data.gymName}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                    {req.type === 'workout_invite' && `@${req.sender.username} • invited you to workout`}
                                    {req.type === 'template_share' && `@${req.sender.username} • shared a routine`}
                                    {req.type === 'workout_share' && `@${req.sender.username} • shared a workout`}
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                    {/* ACTIONS */}
                                    {req.type === 'friend_request' && (
                                        <>
                                            <button onClick={() => handleAction(req, 'accept')} className="btn-primary" style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontWeight: 'bold', background: 'var(--primary)', color: 'black' }}>Accept</button>
                                            <button onClick={() => handleAction(req, 'decline')} className="btn-secondary" style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>Decline</button>
                                        </>
                                    )}

                                    {req.type === 'trainer_invite' && (
                                        <>
                                            <button onClick={() => handleAction(req, 'accept')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontWeight: 'bold', background: 'var(--primary)', color: 'black' }}>Accept Trainer</button>
                                            <button onClick={() => handleAction(req, 'decline')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>Decline</button>
                                        </>
                                    )}

                                    {req.type === 'workout_invite' && (
                                        <>
                                            <button onClick={() => handleAction(req, 'join')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontWeight: 'bold', background: 'var(--brand-yellow)', color: 'black' }}>Join Workout</button>
                                            <button onClick={() => handleAction(req, 'decline')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>Decline</button>
                                        </>
                                    )}

                                    {(req.type === 'template_share' || req.type === 'workout_share') && (
                                        <button onClick={() => handleAction(req, 'dismiss')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>Dismiss</button>
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
