"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

export default function ProfilePage() {
    const { user, getWeeklyStats, getPersonalBests, GYMS } = useStore();
    const { totalWorkouts, totalVolume } = getWeeklyStats();
    const personalBests = getPersonalBests(); // Real data

    const userGym = GYMS.find(g => g.id === user.gymId);

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <img
                        src={user.avatar}
                        style={{
                            width: '96px',
                            height: '96px',
                            borderRadius: '50%',
                            border: '3px solid var(--primary)',
                            objectFit: 'cover'
                        }}
                    />
                    <div style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem'
                    }}>
                        ✏️
                    </div>
                </div>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{user.name}</h1>
                <p style={{ color: 'var(--text-muted)' }}>@{user.handle || 'athlete'}</p>
                {userGym && (
                    <div style={{
                        marginTop: '8px',
                        fontSize: '0.8rem',
                        color: 'var(--primary)',
                        background: 'var(--primary-dim)',
                        padding: '4px 12px',
                        borderRadius: '100px',
                        display: 'inline-block'
                    }}>
                        📍 {userGym.name}
                    </div>
                )}
                {user.bio && <p style={{ marginTop: '8px', fontSize: '0.9rem', maxWidth: '300px', textAlign: 'center' }}>{user.bio}</p>}

                <div style={{ marginTop: '16px', display: 'flex', gap: '24px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{totalWorkouts}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Workouts</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{(totalVolume / 1000).toFixed(1)}k</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Volume</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>12</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Friends</div>
                    </div>
                </div>
            </header>

            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Personal Bests</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {personalBests.map((pb) => (
                        <div key={pb.name} style={{
                            background: 'var(--surface)',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>{pb.name}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary)' }}>{pb.weight}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>{pb.date}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Settings</h3>
                <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <Link href="/profile/settings" style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '16px',
                        background: 'transparent',
                        borderBottom: '1px solid var(--border)',
                        color: 'inherit',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        Edit Profile
                        <span style={{ color: 'var(--text-dim)' }}>›</span>
                    </Link>

                    {['Notifications', 'Privacy Policy', 'Sign Out'].map((item, i) => (
                        <button key={item} style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '16px',
                            background: 'transparent',
                            borderBottom: i !== 2 ? '1px solid var(--border)' : 'none',
                            color: item === 'Sign Out' ? 'var(--warning)' : 'inherit',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            {item}
                            {item !== 'Sign Out' && <span style={{ color: 'var(--text-dim)' }}>›</span>}
                        </button>
                    ))}
                </div>
            </section>

            <BottomNav />
        </div>
    );
}
