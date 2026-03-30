import { useTranslation } from '@/context/TranslationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import DynamicMuscleMap from './muscles/DynamicMuscleMap';
import { useStore } from '@/lib/store';

function MuscleBar({ id, intensity }) {
    if (intensity <= 0) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ flex: 1, height: '6px', borderRadius: '100px', background: 'var(--border)', overflow: 'hidden' }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(1.0, intensity) * 100}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: '100px', background: 'linear-gradient(90deg, #d97706, #faff00)' }}
                />
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '80px', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
                {id.replace(/_/g, ' ')}
            </span>
        </div>
    );
}

function groupMuscleHeat(heatObj) {
    const grouped = {};
    for (const [key, intensity] of Object.entries(heatObj)) {
        if (['chest'].includes(key)) grouped['Chest'] = (grouped['Chest'] || 0) + intensity;
        else if (['lat_front', 'lat_rear', 'mid_back', 'lower_back', 'traps'].includes(key)) grouped['Back'] = (grouped['Back'] || 0) + intensity;
        else if (['quads', 'hamstrings', 'glutes', 'adductors', 'calves_front', 'calves_rear', 'shins'].includes(key)) grouped['Legs'] = (grouped['Legs'] || 0) + intensity;
        else if (['biceps', 'triceps', 'forearms_front', 'forearms_rear'].includes(key)) grouped['Arms'] = (grouped['Arms'] || 0) + intensity;
        else if (['obliques', 'abs'].includes(key)) grouped['Core'] = (grouped['Core'] || 0) + intensity;
        else if (key === 'delts_front') grouped['Front Delts'] = (grouped['Front Delts'] || 0) + intensity;
        else if (key === 'delts_rear') grouped['Rear Delts'] = (grouped['Rear Delts'] || 0) + intensity;
        else grouped[key] = (grouped[key] || 0) + intensity;
    }
    return grouped;
}

export default function StatsTab() {
    const { t } = useTranslation();
    const { getMonthlyStats, getWeeklyMuscleHeat, user } = useStore();
    const { weeklyVolume, muscleSplit } = getMonthlyStats();
    
    const [muscleView, setMuscleView] = useState('front');
    const weeklyHeat = getWeeklyMuscleHeat();

    // Removed auto-toggle to allow manual inspection like website

    const maxVolume = Math.max(...weeklyVolume, 1);

    return (
        <div style={{ padding: '0 4px', paddingBottom: '120px' }}>
            {/* Weekly Muscle Heatmap - MOST PROMINENT AT TOP */}
            <div style={{
                background: 'var(--surface)',
                padding: '24px 20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        🔥 {t('Muscle Impact')}
                    </h3>
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-highlight)', padding: '4px', borderRadius: '100px', position: 'relative', zIndex: 10 }}>
                        {['front', 'rear'].map(v => (
                            <button
                                key={v}
                                onClick={() => setMuscleView(v)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: muscleView === v ? 'var(--primary)' : 'transparent',
                                    color: muscleView === v ? '#000' : 'var(--text-muted)',
                                    transition: 'all 0.3s'
                                }}
                            >
                                {v.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {Object.keys(weeklyHeat).length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '0.95rem' }}>
                        {t('Log a workout to see your heat map!')}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* 3D Model View - ENLARGED */}
                        <div style={{ display: 'flex', justifyContent: 'center', height: '360px', padding: '10px 0', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '380px', height: '380px', background: 'var(--primary)', opacity: '0.08', filter: 'blur(50px)', borderRadius: '50%', pointerEvents: 'none' }} />
                            
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={muscleView}
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    <DynamicMuscleMap
                                        activeMuscles={weeklyHeat}
                                        view={muscleView}
                                        animate={true}
                                        width={200}
                                        height={360}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Layout for Legend and Top Muscles */}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            
                            {/* Legend */}
                            <div>
                                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-dim)', fontWeight: 'bold', marginBottom: '16px' }}>
                                    {t('Intensity / Recovery')}
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {[
                                        { label: t('Burnout / PR'), color: '#faff00', glow: true },
                                        { label: t('Fatigued'), color: '#f59e0b', glow: false },
                                        { label: t('Stimulated'), color: '#92400e', glow: false },
                                        { label: t('Recovered'), color: '#757575', glow: false },
                                    ].map(({ label, color, glow }) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: color, boxShadow: glow ? `0 0 10px ${color}` : 'none' }} />
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Active Muscle Bars */}
                            <div>
                                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-dim)', fontWeight: 'bold', marginBottom: '16px' }}>
                                    {t('Top Fatigued Muscles')}
                                </p>
                                <div>
                                    {Object.entries(groupMuscleHeat(weeklyHeat))
                                        .filter(([, intensity]) => intensity > 0.05)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([id, intensity]) => (
                                            <MuscleBar key={id} id={id} intensity={intensity} />
                                        ))}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

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
