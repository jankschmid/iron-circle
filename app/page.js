"use client";

import { useStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import LiveStatus from '@/components/LiveStatus';
import GymFinder from '@/components/GymFinder';
import Link from 'next/link';

import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
    const { user, activeWorkout, getWeeklyStats } = useStore();
    const router = useRouter();
    const supabase = createClient();
    const [isLongLoading, setIsLongLoading] = useState(false);

    useEffect(() => {
        // Fail-safe: If user is not loaded in 5s, show the retry/reset options unconditionally.
        // We avoid awaiting supabase.auth.getSession() here as that might be what's hanging.
        const timer = setTimeout(() => {
            if (!user) {
                setIsLongLoading(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [user]);

    // Safety check - if no user, rendering will be handled by redirect in store, 
    // but we return empty here to prevent crash
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
                                // "Force" means we don't wait for the server. 
                                // Fire the request but proceed to cleanup immediately.
                                supabase.auth.signOut().catch(err => console.error("Sign out ignored:", err));

                                // Immediate nuclear cleanup
                                localStorage.clear();
                                sessionStorage.clear(); // Clear session storage too just in case

                                // Hard reload to login to clear in-memory states
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
        </div>;
    }

    // Only get stats if user exists
    const { volumeByDay } = getWeeklyStats();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        router.push('/login');
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem' }}>IronCircle</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Welcome back, {user.name.split(' ')[0]}</p>
                    <button onClick={handleLogout} style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px', textDecoration: 'underline' }}>Logout</button>
                </div>
                <img src={user.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--border)' }} />
            </header>

            {/* 3. Onboarding vs Dashboard */}
            {!user.gymId ? (
                <section style={{ marginTop: '32px' }}>
                    <GymFinder />
                </section>
            ) : (
                <>
                    <LiveStatus />

                    <section style={{ marginTop: '32px' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Current Status</h3>

                        {activeWorkout ? (
                            <div style={{
                                background: 'linear-gradient(135deg, var(--surface-highlight), #1a1a1a)',
                                border: '1px solid var(--primary-dim)',
                                padding: '24px',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-glow)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <span style={{
                                        background: 'rgba(255, 61, 0, 0.2)',
                                        color: 'var(--accent)',
                                        padding: '4px 12px',
                                        borderRadius: '100px',
                                        fontSize: '0.8rem',
                                        fontWeight: '700'
                                    }}>IN PROGRESS</span>
                                    <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                                </div>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{activeWorkout.name}</h2>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Started at {new Date(activeWorkout.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>

                                <Link href="/workout" style={{
                                    display: 'block',
                                    width: '100%',
                                    background: 'var(--primary)',
                                    color: '#000',
                                    textAlign: 'center',
                                    padding: '14px',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: '700',
                                    fontSize: '1.1rem'
                                }}>
                                    Resume Workout
                                </Link>
                            </div>
                        ) : (
                            <div style={{
                                background: 'var(--surface)',
                                border: '1px dashed var(--border)',
                                padding: '32px',
                                borderRadius: 'var(--radius-lg)',
                                textAlign: 'center'
                            }}>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>You aren't active right now.</p>
                                <Link href="/workout" style={{
                                    display: 'inline-block',
                                    background: 'var(--surface-highlight)',
                                    color: 'var(--primary)',
                                    border: '1px solid var(--primary)',
                                    padding: '12px 24px',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: '600'
                                }}>
                                    Start a Session
                                </Link>
                            </div>
                        )}
                    </section>

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
                                        <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>Gym Tracker</h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {user.gymId ? (user.auto_tracking_enabled ? 'Auto-Tracking On' : 'Manual Mode') : 'Set Home Gym'}
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

                    <section style={{ marginTop: '32px' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Weekly Volume</h3>
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

            <BottomNav />
        </div>
    );
}
