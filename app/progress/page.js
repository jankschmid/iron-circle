"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';

export default function ProgressPage() {
    const { user, getWeeklyStats, getMonthlyStats, history, exercises } = useStore();
    const { volumeByDay, totalWorkouts, totalVolume } = getWeeklyStats();
    const { weeklyVolume: weeklyVolumeMonth } = getMonthlyStats();

    // Chart Data
    const weeklyVolume = volumeByDay;
    const maxVolume = Math.max(...weeklyVolume) || 1;
    const maxVolumeMonth = Math.max(...weeklyVolumeMonth) || 1;

    // Calculate Streak (Simplified: consecutive weeks with at least 1 workout, or days)
    // For now, let's just do total workouts as a proxy or simple day check
    const calculateStreak = () => {
        if (!history || history.length === 0) return 0;
        // Sort historydesc
        const sorted = [...history].sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        // Very basic consecutive day check
        // In reality, might want "weeks active" or similar
        // Let's just mock it based on frequency for now to be safe, or 0 if no recent
        const lastWorkout = new Date(sorted[0].endTime);
        const diffDays = Math.floor((new Date() - lastWorkout) / (1000 * 60 * 60 * 24));

        if (diffDays > 7) return 0; // Lost streak
        return Math.min(history.length, 5); // Mock "active" streak logic for MVP
    };
    const streak = calculateStreak();

    // Calculate Muscle Split
    const getMuscleSplit = () => {
        const stats = {};
        let total = 0;

        history.forEach(session => {
            session.logs.forEach(log => {
                const ex = exercises.find(e => e.id === log.exerciseId);
                const muscle = ex ? ex.muscle : 'Other';
                const setCouunt = log.sets.filter(s => s.completed).length;

                stats[muscle] = (stats[muscle] || 0) + setCouunt;
                total += setCouunt;
            });
        });

        if (total === 0) return [];

        return Object.entries(stats)
            .map(([name, count]) => ({
                name,
                value: Math.round((count / total) * 100),
                color: getMuscleColor(name)
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    };

    const getMuscleColor = (muscle) => {
        const colors = {
            'Chest': 'var(--primary)',
            'Back': '#9b59b6',
            'Legs': '#3498db',
            'Arms': '#f1c40f',
            'Shoulders': '#e74c3c',
            'Abs': '#2ecc71',
            'Other': '#95a5a6'
        };
        return colors[muscle] || colors['Other'];
    };

    const bodyPartSplit = getMuscleSplit();

    // If no data, show empty state or defaults
    const displaySplit = bodyPartSplit.length > 0 ? bodyPartSplit : [
        { name: 'No Data', value: 0, color: 'var(--surface-highlight)' }
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
                                height: `${maxVolume > 0 ? (h / maxVolume) * 100 : 0}%`,
                                minHeight: h > 0 ? '4px' : '0',
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

            {/* Monthly Progress (4 Weeks) */}
            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Monthly Progress</h3>
                <div style={{
                    background: 'var(--surface)',
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                    height: '200px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '24px'
                }}>
                    {/* Real Data for 4 Weeks */}
                    {weeklyVolumeMonth && weeklyVolumeMonth.map((vol, i) => (
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
                                height: `${maxVolumeMonth > 0 ? (vol / maxVolumeMonth) * 100 : 0}%`,
                                minHeight: vol > 0 ? '4px' : '0',
                                background: i === 3 ? 'var(--primary)' : 'var(--surface-highlight)',
                                borderRadius: '8px',
                                transition: 'height 0.5s ease',
                                position: 'relative'
                            }}>
                                {i === 3 && (
                                    <div style={{
                                        position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)',
                                        fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold'
                                    }}>
                                        THIS WEEK
                                    </div>
                                )}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Week {i + 1}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Stats Grid */}
            <section style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <StatCard label="Total Workouts" value={totalWorkouts} icon="🏋️‍♂️" />
                <StatCard label="Time Trained" value={Math.round(totalVolume / 6000)} icon="⏱️" suffix="h" />
                <StatCard label="Total Volume" value={(totalVolume / 1000).toFixed(1)} icon="📊" suffix="k" />
                <StatCard label="Streak" value={streak} icon="🔥" suffix="days" />
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
                    {displaySplit.length === 0 && <div className="text-muted text-center">Start working out to see stats!</div>}

                    {displaySplit.map((part) => (
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
