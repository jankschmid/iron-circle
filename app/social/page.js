"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

export default function SocialPage() {
    const { friends, user } = useStore();

    // Mock Leaderboard Data - merging current user and friends
    // Use deterministic values for volume to prevent hydration mismatch
    const leaderboardData = [
        { ...user, rank: 1, volume: 45000 },
        ...friends.map(f => {
            // Simple deterministic "random" based on ID char code
            const seed = f.id.charCodeAt(f.id.length - 1);
            const volume = 10000 + (seed * 500);
            return { ...f, volume };
        })
    ].sort((a, b) => b.volume - a.volume).map((u, i) => ({ ...u, rank: i + 1 }));

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px' }}>
                <h1 className="text-gradient">Circle</h1>
            </header>

            {/* Leaderboard */}
            <section style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.2rem' }}>Weekly Leaderboard</h3>
                    <select style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: 'none', fontSize: '0.8rem' }}>
                        <option>Volume</option>
                        <option>Frequency</option>
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
                            <Link href={`/profile/${athlete.id}`} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
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
                                    {(athlete.volume / 1000).toFixed(1)}k <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>kg</span>
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
