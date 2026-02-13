"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import WorkoutHeatmap from '@/components/WorkoutHeatmap';
import { getLevelProgress } from '@/lib/gamification';
import { useTranslation } from '@/context/TranslationContext'; // Import Hook

import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
    const { t } = useTranslation(); // Use Hook
    const { user, getWeeklyStats, getPersonalBests, gyms, friends, history } = useStore();
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
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--foreground)' }}>{t('Connection Issue')}</h2>
                        <p>{t("We're having trouble loading your data.")}</p>
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
                            {t('Retry Connection')}
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
                            {t('Log Out & Reset')}
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
                    <p>{t('Syncing...')}</p>
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

    // Gamification
    const { currentLevel, percent, totalNeeded, progress } = getLevelProgress(user.xp || 0);

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
                        src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id || 'guest'}`}
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                        <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--primary)',
                            background: 'var(--primary-dim)',
                            padding: '4px 12px',
                            borderRadius: '100px',
                            display: 'inline-block'
                        }}>
                            📍 {userGym.name}
                        </div>
                        {userGym.role === 'owner' && (
                            <div style={{ background: '#FFD700', color: '#000', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                👑 {t('Owner')}
                            </div>
                        )}
                        {userGym.role === 'admin' && (
                            <div style={{ background: 'var(--error)', color: '#fff', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                🛡️ {t('Admin')}
                            </div>
                        )}
                        {userGym.role === 'trainer' && (
                            <div style={{ background: 'var(--brand-yellow)', color: '#000', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                💪 {t('Trainer')}
                            </div>
                        )}
                        {(userGym.role === 'member' || !userGym.role) && (
                            <div style={{ background: 'var(--surface-highlight)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid var(--border)' }}>
                                👤 {t('Member')}
                            </div>
                        )}
                    </div>
                )}


                {/* Level Progress */}
                <div style={{ width: '100%', maxWidth: '240px', margin: '12px 0 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-dim)', fontWeight: '600' }}>
                        <span style={{ color: 'var(--primary)' }}>{t('Level')} {currentLevel}</span>
                        <span>{Math.floor(progress)} / {totalNeeded} XP</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--surface-highlight)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s ease' }}></div>
                    </div>
                </div>

                {user.bio && <p style={{ marginTop: '8px', fontSize: '0.9rem', maxWidth: '300px', textAlign: 'center' }}>{user.bio}</p>}

                <div style={{ marginTop: '16px', display: 'flex', gap: '24px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{totalWorkouts}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Workouts')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{(totalVolume / 1000).toFixed(1)}k</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Volume')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{friends?.length || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Friends')}</div>
                    </div>
                </div>
            </header>

            <section style={{ marginBottom: '32px' }}>
                <WorkoutHeatmap history={history} />
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>{t('Personal Bests')}</h3>
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
                {/* Settings & Notifications Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <Link href="/profile/settings" style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: 'var(--surface)',
                            padding: '24px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            height: '100%'
                        }}>
                            <div style={{ fontSize: '1.8rem' }}>⚙️</div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{t('Settings')}</div>
                        </div>
                    </Link>

                    <Link href="/profile/notifications" style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: 'var(--surface)',
                            padding: '24px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            height: '100%'
                        }}>
                            <div style={{ fontSize: '1.8rem' }}>🔔</div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{t('Notifications')}</div>
                        </div>
                    </Link>
                </div>

                {/* Role Based Access */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(user.is_super_admin) && (
                        <Link href="/admin/master" style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '16px',
                                background: 'rgba(255, 0, 0, 0.1)',
                                border: '1px solid #ff4444',
                                borderRadius: 'var(--radius-md)',
                                color: '#ff4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontWeight: 'bold'
                            }}>
                                <span>⚡</span> {t('Master Admin Panel')}
                            </div>
                        </Link>
                    )}

                    {(userGym?.role === 'trainer' || userGym?.role === 'admin' || userGym?.role === 'owner') && (
                        <Link href={`/trainer/dashboard?gymId=${userGym.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '16px',
                                background: 'rgba(255, 200, 0, 0.1)',
                                border: '1px solid #FFC800',
                                borderRadius: 'var(--radius-md)',
                                color: '#FFC800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontWeight: 'bold'
                            }}>
                                <span>📋</span> {t('Coach Panel')}
                            </div>
                        </Link>
                    )}

                    {(userGym?.role === 'admin' || userGym?.role === 'owner') && (
                        <Link href={`/gym/admin?id=${userGym.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '16px',
                                background: 'rgba(50, 50, 200, 0.15)',
                                border: '1px solid #4488ff',
                                borderRadius: 'var(--radius-md)',
                                color: '#4488ff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontWeight: 'bold'
                            }}>
                                <span>🏢</span> {t('Gym Admin Dashboard')}
                            </div>
                        </Link>
                    )}

                    <button onClick={handleLogout} style={{
                        width: '100%',
                        padding: '16px',
                        background: 'transparent',
                        color: 'var(--error)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        {t('Sign Out')}
                    </button>
                </div>
            </section>

            <BottomNav />
        </div>
    );
}
