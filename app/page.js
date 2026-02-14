"use client";

import { useStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import LiveStatus from '@/components/LiveStatus';
import OperationsBoard from '@/components/OperationsBoard';
import GoalSelectorModal from '@/components/GoalSelectorModal'; // Added
import GymFinder from '@/components/GymFinder';
import Link from 'next/link';

import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/TranslationContext';

export default function Home() {
    const { t } = useTranslation();
    const { user, activeWorkout, getWeeklyStats } = useStore();
    const router = useRouter();
    const supabase = createClient();
    const [isLongLoading, setIsLongLoading] = useState(false);

    useEffect(() => {
        // Fail-safe: If user is not loaded in 5s, show the retry/reset options unconditionally.
        const timer = setTimeout(() => {
            if (!user) {
                setIsLongLoading(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [user]);

    // 3. Onboarding Redirect Check
    useEffect(() => {
        if (user && (!user.gymId || !user.height)) {
            router.push('/profile/setup');
        }
    }, [user, router]);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error("SignOut failed", e);
        } finally {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login';
        }
    };

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
        return <div style={{
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
        </div>;
    }

    // Only get stats if user exists
    const { volumeByDay } = getWeeklyStats();

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem' }}>IronCircle</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('Welcome back')}, {user.name ? user.name.split(' ')[0] : t('Athlete')}</p>
                    <button onClick={handleLogout} style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px', textDecoration: 'underline' }}>{t('Logout')}</button>
                </div>
                <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id || 'guest'}`} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--border)' }} />
            </header>

            {/* 3. Onboarding vs Dashboard */}
            {(!user.gymId || !user.height) ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p>{t('Redirecting to setup...')}</p>
                </div>
            ) : (
                <>
                    <LiveStatus />

                    {/* Gym Tracker Card */}
                    <section style={{ marginTop: '16px' }}>
                        <Link href="/tracker" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                padding: '20px',
                                borderRadius: 'var(--radius-lg)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '16px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: 'var(--surface-highlight)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem'
                                    }}>
                                        📍
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{t('Gym Tracker')}</h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {user.gymId ? (user.auto_tracking_enabled ? t('Auto-Tracking On') : t('Manual Mode')) : t('Set Home Gym')}
                                        </p>
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '1.2rem',
                                    color: 'var(--text-muted)'
                                }}>
                                    →
                                </div>
                            </div>
                        </Link>
                    </section>

                    {/* Active Operations */}
                    <section style={{ marginTop: '24px', marginBottom: '24px' }}>
                        <OperationsBoard userId={user.id} />
                    </section>

                    <section style={{ marginTop: '32px' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>{t('Weekly Volume')}</h3>
                        <div style={{
                            background: 'var(--surface)',
                            padding: '20px',
                            borderRadius: 'var(--radius-md)',
                            height: '150px',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            gap: '8px'
                        }}>
                            {volumeByDay.map((h, i) => (
                                <div key={i} style={{
                                    width: '100%',
                                    height: `${(h / (Math.max(...volumeByDay) || 1)) * 100}%`,
                                    background: i === new Date().getDay() - 1 ? 'var(--primary)' : 'var(--border)',
                                    borderRadius: '4px 4px 0 0',
                                    opacity: 0.8
                                }} />
                            ))}
                        </div>
                    </section>
                </>
            )}

            {/* Floating Goal Selector Modal (Edge Case: Force Goal Selection) */}
            <GoalSelectorModal />

            <BottomNav />
        </div>
    );
}
