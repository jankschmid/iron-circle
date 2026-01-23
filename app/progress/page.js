"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';

export default function ProgressPage() {
    const { user, getWeeklyStats } = useStore();
    const { volumeByDay, totalWorkouts, totalVolume } = getWeeklyStats();

    // Chart Data
    const weeklyVolume = volumeByDay;
    const maxVolume = Math.max(...weeklyVolume) || 1; // Avoid divide by zero

    const bodyPartSplit = [
        { name: 'Chest', value: 30, color: 'var(--primary)' },
        { name: 'Back', value: 25, color: '#9b59b6' },
        { name: 'Legs', value: 25, color: '#3498db' },
        { name: 'Arms', value: 10, color: '#f1c40f' },
        { name: 'Shoulders', value: 10, color: '#e74c3c' },
    ];

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px' }}>
                <h1 className="text-gradient">Stats</h1>
            </header>

            {/* Weekly Volume Chart */}
            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Weekly Volume</h3>
                <div style={{
                    background: 'var(--surface)',
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                    height: '200px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '12px'
                }}>
                    {weeklyVolume.map((h, i) => (
                        <div key={i} style={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            height: '100%',
                            justifyContent: 'flex-end'
                        }}>
                            <div style={{
                                width: '100%',
                                height: `${(h / maxVolume) * 100}%`,
                                background: i === 5 ? 'var(--primary)' : 'var(--border)',
                                borderRadius: '4px',
                                opacity: 0.8,
                                transition: 'height 0.5s ease'
                            }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Stats Grid */}
            <section style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <StatCard label="Total Workouts" value="42" icon="🏋️‍♂️" />
                <StatCard label="Time Trained" value="38h" icon="⏱️" />
                <StatCard label="Total Volume" value="450k" icon="📊" suffix="kg" />
                <StatCard label="Streak" value="5" icon="🔥" suffix="days" />
            </section>

            {/* Body Part Split */}
            <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Muscle Split</h3>
                <div style={{
                    background: 'var(--surface)',
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                }}>
                    {bodyPartSplit.map((part) => (
                        <div key={part.name} style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                <span>{part.name}</span>
                                <span style={{ color: 'var(--text-muted)' }}>{part.value}%</span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '8px',
                                background: 'var(--surface-highlight)',
                                borderRadius: '100px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${part.value}%`,
                                    height: '100%',
                                    background: part.color,
                                    borderRadius: '100px'
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <BottomNav />
        </div>
    );
}

function StatCard({ label, value, icon, suffix }) {
    return (
        <div style={{
            background: 'var(--surface)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>
            <span style={{ fontSize: '1.5rem' }}>{icon}</span>
            <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--foreground)' }}>
                    {value}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '4px' }}>{suffix}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
        </div>
    );
}
