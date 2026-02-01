"use client";

import { useStore } from '@/lib/store';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

export default function SocialTab() {
    const { friends, user, getWeeklyStats, joinSession, removeFriend } = useStore();
    const { weeklyVolume, weeklyWorkouts, weeklyTime } = getWeeklyStats(); // User's own weekly stats
    const router = useRouter();
    const supabase = createClient();
    const toast = useToast();
    const [isLongLoading, setIsLongLoading] = useState(false);

    const [showFriendsModal, setShowFriendsModal] = useState(false);
    const [removingFriendId, setRemovingFriendId] = useState(null);
    const [sortBy, setSortBy] = useState('Volume');

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!user) {
                setIsLongLoading(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [user]);

    if (!user) {
        if (isLongLoading) {
            return (
                <div style={{
                    minHeight: '50vh', // Adjusted for tab content
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '24px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--foreground)' }}>Connection Issue</h2>
                        <p>We're having trouble loading your data.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', width: '100%', maxWidth: '300px' }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                color: '#000',
                                background: 'var(--primary)',
                                border: 'none',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Retry Connection
                        </button>
                    </div>
                </div>
            );
        }
        return (
            <div style={{
                minHeight: '50vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className="spinner"></div>
                    <p>Syncing...</p>
                </div>
                <style jsx>{`
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid var(--surface-highlight);
                        border-top: 4px solid var(--primary);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Real Leaderboard Data
    const rawData = [
        {
            ...user,
            id: user.id,
            name: user.name,
            handle: user.handle,
            avatar: user.avatar,
            stats: {
                Volume: weeklyVolume,
                Workouts: weeklyWorkouts,
                Time: weeklyTime,
                Level: user.level || 1,
                XP: user.xp || 0
            }
        },
        ...friends.map(f => ({
            ...f,
            stats: {
                Volume: f.weeklyStats?.volume || 0,
                Workouts: f.weeklyStats?.workouts || 0,
                Time: f.weeklyStats?.time || 0,
                Level: f.level || 1,
                XP: f.xp || 0
            }
        }))
    ];

    const leaderboardData = rawData
        .sort((a, b) => b.stats[sortBy] - a.stats[sortBy])
        .map((u, i) => ({ ...u, rank: i + 1 }));

    const formatValue = (metric, value) => {
        if (metric === 'Volume') return `${(value / 1000).toFixed(1)}k`;
        if (metric === 'Time') return `${Math.round(value / 60)}m`;
        if (metric === 'XP') return `${(value / 1000).toFixed(1)}k`;
        return value;
    };

    const getUnit = (metric) => {
        if (metric === 'Volume') return 'kg';
        if (metric === 'Time') return ''; // min handled in formatValue via 'm' suffix usually? 
        // Wait, formatValue returns string for Time. getUnit returns empty.
        if (metric === 'Level') return 'Lvl';
        if (metric === 'XP') return 'XP';
        return '';
    };

    return (
        <div style={{ paddingBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                {/* Header is handled by parent Connect page usually, but keeping Find Friends here */}
                <div></div>
                <Link href="/social/add" style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    border: '1px solid var(--primary-dim)',
                    padding: '8px 16px',
                    borderRadius: '100px'
                }}>
                    + Find Friends
                </Link>
            </div>

            {/* Leaderboard */}
            <section style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.2rem' }}>Weekly Leaderboard</h3>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: 'none', fontSize: '0.8rem', padding: '4px' }}
                    >
                        <option value="Volume">Volume</option>
                        <option value="Workouts">Workouts</option>
                        <option value="Time">Time</option>
                        <option value="Level">Level</option>
                        <option value="XP">XP</option>
                    </select>
                </div>

                <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    {leaderboardData.map((athlete) => (
                        <div key={athlete.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '16px',
                            borderBottom: '1px solid var(--border)',
                            background: athlete.id === user.id ? 'var(--surface-highlight)' : 'transparent'
                        }}>
                            <Link href={`/profile/view?id=${athlete.id}`} style={{ display: 'flex', alignItems: 'center', width: '100%', textDecoration: 'none', color: 'inherit' }}>
                                <div style={{
                                    width: '24px',
                                    fontWeight: '700',
                                    color: athlete.rank === 1 ? 'var(--warning)' : 'var(--text-muted)'
                                }}>
                                    {athlete.rank}
                                </div>
                                <img src={athlete.avatar} style={{ width: '32px', height: '32px', borderRadius: '50%', margin: '0 12px' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600' }}>{athlete.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{athlete.handle}</div>
                                </div>
                                <div style={{ fontWeight: '700', color: 'var(--primary)' }}>
                                    {formatValue(sortBy, athlete.stats[sortBy])} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{getUnit(sortBy)}</span>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* Activity Feed / Friends */}
            <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Friend Activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {friends.map(friend => (
                        <div key={friend.id} style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ position: 'relative' }}>
                                <img src={friend.avatar} style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                                {friend.status === 'active' && (
                                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', background: 'var(--success)', borderRadius: '50%', border: '2px solid var(--background)' }} />
                                )}
                                {/* Party indicator - show if friend is in a group workout */}
                                {friend.status === 'active' && friend.activity?.group_id && friend.activity?.partySize > 1 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        background: 'var(--brand-yellow)',
                                        color: '#000',
                                        borderRadius: '50%',
                                        width: '20px',
                                        height: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        border: '2px solid var(--background)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}>
                                        {friend.activity.partySize}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Link href={`/profile/view?id=${friend.id}`}>
                                    <div style={{ fontWeight: '600' }}>{friend.name}</div>
                                </Link>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {friend.status === 'active' ? `Training ${friend.activity?.detail}` : `Last active ${friend.lastActive}`}
                                </div>
                                {friend.status === 'active' && (
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                        <button style={{
                                            fontSize: '0.8rem',
                                            padding: '4px 12px',
                                            background: 'var(--primary-dim)',
                                            color: '#000',
                                            borderRadius: '100px',
                                            fontWeight: '600',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}>
                                            Send 🔥
                                        </button>

                                        {/* Show Join button if they are in a tracker session and we are not */}
                                        {friend.activity?.type === 'tracker' && !useStore.getState?.()?.workoutSession && (
                                            <button
                                                onClick={() => {
                                                    if (friend.activity?.group_id) {
                                                        // Join the session
                                                        joinSession(friend.activity.group_id, friend.activity.gym_id);
                                                        router.push('/workout/active');
                                                    } else {
                                                        toast.error("Cannot join this session (No Group ID)");
                                                    }
                                                }}
                                                style={{
                                                    fontSize: '0.8rem',
                                                    padding: '4px 12px',
                                                    background: 'var(--brand-yellow)',
                                                    color: '#000',
                                                    borderRadius: '100px',
                                                    fontWeight: '600',
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}>
                                                Valhalla ⚔️
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Custom Circle Modal Trigger */}
            <section style={{ marginTop: '32px', textAlign: 'center' }}>
                <button
                    onClick={() => setShowFriendsModal(true)}
                    style={{
                        padding: '12px 24px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        borderRadius: '100px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                    }}
                >
                    View Your Circle ({friends.length})
                </button>
            </section>

            {/* Friends Modal */}
            {showFriendsModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }} onClick={() => setShowFriendsModal(false)}>
                    <div style={{
                        background: 'var(--surface)',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '80vh',
                        borderRadius: '16px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Your Circle</h2>
                            <button onClick={() => setShowFriendsModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                        </div>

                        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                            {friends.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No friends yet. <Link href="/social/add" style={{ color: 'var(--primary)' }}>Find some!</Link>
                                </div>
                            ) : (
                                friends.map(friend => (
                                    <div key={friend.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'var(--surface-highlight)',
                                        padding: '12px 16px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <Link href={`/profile/view?id=${friend.id}`} onClick={() => setShowFriendsModal(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit', flex: 1 }}>
                                            <img src={friend.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                            <div>
                                                <div style={{ fontWeight: '600' }}>{friend.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{friend.handle}</div>
                                            </div>
                                        </Link>

                                        <button
                                            onClick={() => setRemovingFriendId(friend.id)}
                                            style={{
                                                background: 'rgba(255, 0, 0, 0.1)',
                                                border: '1px solid rgba(255, 0, 0, 0.3)',
                                                borderRadius: '6px',
                                                padding: '6px 12px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                color: 'var(--error)',
                                                fontWeight: '600'
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Friend Confirmation Modal */}
            {removingFriendId && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }} onClick={() => setRemovingFriendId(null)}>
                    <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '350px' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '16px', color: 'var(--error)' }}>Remove Friend?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                            Are you sure you want to remove this person from your circle?
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setRemovingFriendId(null)}
                                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    console.log("Remove button clicked, friendId:", removingFriendId);
                                    const success = await removeFriend(removingFriendId);
                                    console.log("removeFriend result:", success);
                                    if (success) {
                                        setRemovingFriendId(null);
                                    } else {
                                        toast.error("Failed to remove friend.");
                                    }
                                }}
                                style={{ flex: 1, padding: '12px', background: 'var(--error)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
