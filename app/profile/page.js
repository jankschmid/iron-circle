"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
    const { user, getWeeklyStats, getPersonalBests, gyms, friends } = useStore();
    const router = useRouter();
    // Fix: Create client once to avoid lock contention
    const [supabase] = useState(() => createClient());
    const [isLongLoading, setIsLongLoading] = useState(false);

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

    const { totalWorkouts, totalVolume } = getWeeklyStats();
    const personalBests = getPersonalBests(); // Real data

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // Fallback: Force redirect even if listener is slow
        router.push('/login');
    };

    const userGym = (gyms || []).find(g => g.id === user.gymId);

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
                <p style={{ color: 'var(--text-muted)' }}>{user.handle || '@athlete'}</p>
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
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{friends?.length || 0}</div>
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
                    {/* Navigation Buttons */}
                    <Link href="/profile/edit" style={{
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
                        Account Settings
                        <span style={{ color: 'var(--text-dim)' }}>›</span>
                    </Link>
                    <Link href="/profile/notifications" style={{
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
                        Notifications
                        <span style={{ color: 'var(--text-dim)' }}>›</span>
                    </Link>

                    <Link href="/settings/privacy" style={{
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
                        Privacy & Ghost Mode 👻
                        <span style={{ color: 'var(--text-dim)' }}>›</span>
                    </Link>

                    {/* Conditional Coach Panel */}
                    {(user.is_super_admin) && (
                        <Link href="/admin/master" style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '16px',
                            background: 'rgba(255, 0, 0, 0.1)', // Red tint for Master Admin
                            borderBottom: '1px solid var(--border)',
                            color: '#ff4444',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontWeight: 'bold'
                        }}>
                            Master Admin Panel
                            <span style={{ color: '#ff4444' }}>›</span>
                        </Link>
                    )}

                    {(userGym?.role === 'trainer' || userGym?.role === 'admin') && (
                        <Link href={`/trainer/dashboard?gymId=${userGym.id}`} style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '16px',
                            background: 'rgba(255, 200, 0, 0.1)', // Gold tint
                            borderBottom: '1px solid var(--border)',
                            color: '#FFC800',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontWeight: 'bold'
                        }}>
                            Coach Panel
                            <span style={{ color: '#FFC800' }}>›</span>
                        </Link>
                    )}

                    <button onClick={handleLogout} style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '16px',
                        background: 'transparent',
                        color: 'var(--warning)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: '600'
                    }}>
                        Sign Out
                    </button>
                </div>
            </section>

            <BottomNav />
        </div>
    );
}
