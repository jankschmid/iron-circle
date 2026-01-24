"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SocialPage() {
    const { friends, user, getWeeklyStats } = useStore();
    const { weeklyVolume, weeklyWorkouts, weeklyTime } = getWeeklyStats(); // User's own weekly stats
    const router = useRouter();
    const supabase = createClient();
    const [isLongLoading, setIsLongLoading] = useState(false);

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
                    minHeight: '100vh',
                    background: 'var(--background)',
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
                        <button
                            onClick={async () => {
                                supabase.auth.signOut().catch(err => console.error("Sign out ignored:", err));
                                localStorage.clear();
                                sessionStorage.clear();
                                window.location.href = '/login';
                            }}
                            style={{
                                color: 'var(--text-muted)',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer'
                            }}
                        >
                            Log Out & Reset
                        </button>
                    </div>
                </div>
            );
        }
        return (
            <div style={{
                minHeight: '100vh',
                background: 'var(--background)',
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
                Time: weeklyTime
            }
        },
        ...friends.map(f => ({
            ...f,
            stats: {
                Volume: f.weeklyStats?.volume || 0,
                Workouts: f.weeklyStats?.workouts || 0,
                Time: f.weeklyStats?.time || 0
            }
        }))
    ];

    const leaderboardData = rawData
        .sort((a, b) => b.stats[sortBy] - a.stats[sortBy])
        .map((u, i) => ({ ...u, rank: i + 1 }));

    const formatValue = (metric, value) => {
        if (metric === 'Volume') return `${(value / 1000).toFixed(1)}k`;
        if (metric === 'Time') return `${Math.round(value / 60)}m`;
        return value;
    };

    const getUnit = (metric) => {
        if (metric === 'Volume') return 'kg';
        if (metric === 'Time') return '';
        return '';
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="text-gradient">Circle</h1>
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
            </header>

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
                            <Link href={`/profile/${athlete.id}`} style={{ display: 'flex', alignItems: 'center', width: '100%', textDecoration: 'none', color: 'inherit' }}>
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
                            </div>
                            <div>
                                <Link href={`/profile/${friend.id}`}>
                                    <div style={{ fontWeight: '600' }}>{friend.name}</div>
                                </Link>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {friend.status === 'active' ? `Training ${friend.activity?.detail}` : `Last active ${friend.lastActive}`}
                                </div>
                                {friend.status === 'active' && (
                                    <div style={{ marginTop: '8px' }}>
                                        <button style={{
                                            fontSize: '0.8rem',
                                            padding: '4px 12px',
                                            background: 'var(--primary-dim)',
                                            color: '#000',
                                            borderRadius: '100px',
                                            fontWeight: '600'
                                        }}>
                                            Send 🔥
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <BottomNav />
        </div>
    );
}
