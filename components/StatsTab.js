import { useStore } from '@/lib/store';
import { useTranslation } from '@/context/TranslationContext';
import { motion } from 'framer-motion';

export default function StatsTab() {
    const { t } = useTranslation();
    const { getMonthlyStats, user } = useStore();
    const { weeklyVolume, muscleSplit } = getMonthlyStats();

    const maxVolume = Math.max(...weeklyVolume, 1);

    return (
        <div style={{ padding: '0 4px' }}>
            {/* Volume Chart */}
            <div style={{
                background: 'var(--surface)',
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                marginBottom: '24px'
            }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📊 {t('Volume Trend')} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(Last 4 Weeks)</span>
                </h3>

                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '150px', gap: '12px' }}>
                    {weeklyVolume.map((vol, i) => (
                        <div key={i} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(vol / maxVolume) * 100}%` }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                style={{
                                    width: '100%',
                                    background: i === 3 ? 'var(--primary)' : 'var(--surface-highlight)',
                                    borderRadius: '4px 4px 0 0',
                                    minHeight: '4px'
                                }}
                            />
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                {i === 3 ? t('This Week') : `W-${3 - i}`}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Muscle Split */}
            <div style={{
                background: 'var(--surface)',
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                marginBottom: '24px'
            }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>
                    💪 {t('Muscle Split')} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(Last 30 Days)</span>
                </h3>

                {muscleSplit.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        {t('No data available yet.')}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {muscleSplit.map((m, i) => (
                            <div key={m.name}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                                    <span style={{ textTransform: 'capitalize' }}>{t(m.name)}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{m.count} {t('sets')}</span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: 'var(--surface-highlight)',
                                    borderRadius: '100px',
                                    overflow: 'hidden'
                                }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(m.count / Math.max(...muscleSplit.map(x => x.count))) * 100}%` }}
                                        transition={{ duration: 1 }}
                                        style={{
                                            height: '100%',
                                            background: i % 2 === 0 ? 'var(--primary)' : 'var(--brand-blue)',
                                            borderRadius: '100px'
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Fun Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '2rem' }}>🔥</div>
                    <div style={{ fontWeight: '900', fontSize: '1.5rem', margin: '0', color: '#fff' }}>{user.streak || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('Day Streak')}</div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '2rem' }}>🏋️</div>
                    <div style={{ fontWeight: '900', fontSize: '1.5rem', margin: '0', color: '#fff' }}>{user.lifetime_workouts || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('Lifetime Sessions')}</div>
                </div>
            </div>
        </div>
    );
}
