"use client";

import { useStore } from '@/lib/store';

import { useTranslation } from '@/context/TranslationContext';

export default function StatsView() {
    const { getWeeklyStats, history, exercises } = useStore();
    const { t } = useTranslation();
    const { volumeByDay, totalWorkouts, totalVolume } = getWeeklyStats();

    // Chart Data
    const weeklyVolume = volumeByDay;
    const maxVolume = Math.max(...weeklyVolume) || 1;

    // Calculate Streak
    const calculateStreak = () => {
        if (!history || history.length === 0) return 0;
        const sorted = [...history].sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        const lastWorkout = new Date(sorted[0].endTime);
        const diffDays = Math.floor((new Date() - lastWorkout) / (1000 * 60 * 60 * 24));

        if (diffDays > 7) return 0;
        return Math.min(history.length, 5); // Mock/Simple logic
    };
    const streak = calculateStreak();

    // Calculate Muscle Split
    const getMuscleSplit = () => {
        const stats = {};
        let total = 0;

        history.forEach(session => {
            if (!session.logs || !Array.isArray(session.logs)) return;

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
        // Use the untranslated key for looking up colors
        return colors[muscle] || colors['Other'];
    };


    const bodyPartSplit = getMuscleSplit();

    const displaySplit = bodyPartSplit.length > 0 ? bodyPartSplit : [
        { name: 'No Data', value: 0, color: 'var(--surface-highlight)' }
    ];

    return (
        <div style={{ paddingBottom: '20px' }}>
            {/* Weekly Volume Chart */}
            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>{t('Weekly Volume')}</h3>
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
                                {t(['M', 'T', 'W', 'T', 'F', 'S', 'S'][i])}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Stats Grid */}
            <section style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <StatCard label={t('Total Workouts')} value={totalWorkouts} icon="🏋️‍♂️" />
                <StatCard label={t('Time Trained')} value={Math.round(totalVolume / 6000)} icon="⏱️" suffix="h" />
                <StatCard label={t('Total Volume')} value={(totalVolume / 1000).toFixed(1)} icon="📊" suffix="k" />
                <StatCard label={t('Streak')} value={streak} icon="🔥" suffix={t('days')} />
            </section>

            {/* Body Part Split */}
            <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>{t('Muscle Split')}</h3>
                <div style={{
                    background: 'var(--surface)',
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                }}>
                    {displaySplit.length === 0 && <div className="text-muted text-center">{t('Start working out to see stats!')}</div>}

                    {displaySplit.map((part) => (
                        <div key={part.name} style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                <span>{t(part.name)}</span>
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
