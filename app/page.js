"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import LiveStatus from '@/components/LiveStatus';
import Link from 'next/link';

export default function Home() {
    const { user, activeWorkout, getWeeklyStats } = useStore();
    const { volumeByDay } = getWeeklyStats();

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem' }}>IronCircle</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Welcome back, {user.name.split(' ')[0]}</p>
                </div>
                <img src={user.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--border)' }} />
            </header>

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

            <BottomNav />
        </div>
    );
}
