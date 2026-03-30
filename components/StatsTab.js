import { useTranslation } from '@/context/TranslationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import DynamicMuscleMap from './muscles/DynamicMuscleMap';
import WorkoutHeatmap from './WorkoutHeatmap';
import { useStore } from '@/lib/store';
import { calculatePRs, detectPlateau } from '@/lib/algorithms';

// ─── helpers ──────────────────────────────────────────────────────────────────

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

/** Compute volume grouped by ISO week for the last N weeks */
function getWeeklyVolumes(history, weeks = 12) {
    const result = new Array(weeks).fill(0);
    const now = new Date();

    history.forEach(session => {
        if (!session.endTime) return;
        const d = new Date(session.endTime);
        const diffMs = now - d;
        const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
        if (diffWeeks >= 0 && diffWeeks < weeks) {
            // index 0 = current week, index 11 = oldest
            result[diffWeeks] += session.volume || 0;
        }
    });

    return result.reverse(); // oldest → newest (left to right)
}

// ─── main component ───────────────────────────────────────────────────────────

export default function StatsTab() {
    const { t } = useTranslation();
    const { getMonthlyStats, getWeeklyMuscleHeat, history, exercises, user } = useStore();
    const { muscleSplit } = getMonthlyStats();

    // Heatmap mode: 'muscles' or 'activity'
    const [heatmapMode, setHeatmapMode] = useState('muscles');
    const [muscleView, setMuscleView] = useState('front');
    const [showAllPRs, setShowAllPRs] = useState(false);

    const weeklyHeat = getWeeklyMuscleHeat();

    // 12-week volume trend
    const volumeTrend = useMemo(() => getWeeklyVolumes(history || [], 12), [history]);
    const maxVolume = Math.max(...volumeTrend, 1);

    // PRs & 1RM
    const allPRs = useMemo(() => calculatePRs(history || [], exercises || []), [history, exercises]);
    const displayedPRs = showAllPRs ? allPRs : allPRs.slice(0, 5);

    return (
        <div style={{ padding: '0 4px', paddingBottom: '120px' }}>

            {/* ── HEATMAP BLOCK ───────────────────────────────── */}
            <div style={{
                background: 'var(--surface)',
                padding: '24px 20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Top Row: Title + Mode Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                        {heatmapMode === 'muscles' ? `🔥 ${t('Muscle Impact')}` : `📅 ${t('Activity')}`}
                    </h3>
                    {/* Outer mode toggle */}
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-highlight)', padding: '4px', borderRadius: '100px' }}>
                        {[
                            { key: 'muscles', label: '💪' },
                            { key: 'activity', label: '📅' }
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setHeatmapMode(key)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    fontSize: '0.85rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: heatmapMode === key ? 'var(--primary)' : 'transparent',
                                    color: heatmapMode === key ? '#000' : 'var(--text-muted)',
                                    fontWeight: heatmapMode === key ? 'bold' : 'normal',
                                    transition: 'all 0.25s'
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {heatmapMode === 'muscles' ? (
                        <motion.div key="muscles" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                            {/* Front / Rear sub-toggle */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', gap: '4px', background: 'var(--background)', padding: '3px', borderRadius: '100px' }}>
                                    {['front', 'rear'].map(v => (
                                        <button key={v} onClick={() => setMuscleView(v)} style={{
                                            padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 'bold',
                                            border: 'none', cursor: 'pointer',
                                            background: muscleView === v ? 'var(--primary)' : 'transparent',
                                            color: muscleView === v ? '#000' : 'var(--text-muted)',
                                            transition: 'all 0.2s'
                                        }}>
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
                                    {/* Muscle Model */}
                                    <div style={{ display: 'flex', justifyContent: 'center', height: '340px', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '300px', height: '300px', background: 'var(--primary)', opacity: 0.07, filter: 'blur(50px)', borderRadius: '50%', pointerEvents: 'none' }} />
                                        <AnimatePresence mode="wait">
                                            <motion.div key={muscleView} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.3 }}>
                                                <DynamicMuscleMap activeMuscles={weeklyHeat} view={muscleView} animate={true} width={200} height={340} />
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>

                                    {/* Legend + Top Muscles */}
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div>
                                            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-dim)', fontWeight: 'bold', marginBottom: '12px' }}>
                                                {t('Intensity / Recovery')}
                                            </p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                {[
                                                    { label: t('Burnout / PR'), color: '#faff00', glow: true },
                                                    { label: t('Fatigued'), color: '#f59e0b' },
                                                    { label: t('Stimulated'), color: '#92400e' },
                                                    { label: t('Recovered'), color: '#757575' },
                                                ].map(({ label, color, glow }) => (
                                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, boxShadow: glow ? `0 0 8px ${color}` : 'none', flexShrink: 0 }} />
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-dim)', fontWeight: 'bold', marginBottom: '12px' }}>
                                                {t('Top Fatigued Muscles')}
                                            </p>
                                            {Object.entries(groupMuscleHeat(weeklyHeat))
                                                .filter(([, intensity]) => intensity > 0.05)
                                                .sort(([, a], [, b]) => b - a)
                                                .slice(0, 5)
                                                .map(([id, intensity]) => <MuscleBar key={id} id={id} intensity={intensity} />)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                            <WorkoutHeatmap history={history || []} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── 12-WEEK VOLUME TREND ────────────────────────── */}
            <div style={{
                background: 'var(--surface)',
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                marginBottom: '24px'
            }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📊 {t('Volume Trend')} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(Last 12 Weeks)</span>
                </h3>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '130px', overflowX: 'auto' }}>
                    {volumeTrend.map((vol, i) => {
                        const isCurrentWeek = i === volumeTrend.length - 1;
                        const heightPct = maxVolume > 0 ? (vol / maxVolume) * 100 : 0;
                        return (
                            <div key={i} style={{ flex: '0 0 auto', width: 'calc((100% - 44px) / 12)', minWidth: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${heightPct}%` }}
                                    transition={{ duration: 0.5, delay: i * 0.04 }}
                                    style={{
                                        width: '100%',
                                        background: isCurrentWeek
                                            ? 'var(--primary)'
                                            : vol > 0 ? 'var(--surface-highlight)' : 'rgba(255,255,255,0.04)',
                                        borderRadius: '3px 3px 0 0',
                                        minHeight: vol > 0 ? '3px' : '0',
                                        boxShadow: isCurrentWeek ? '0 0 8px rgba(250,255,0,0.4)' : 'none'
                                    }}
                                />
                                {(i === 0 || i === 5 || i === 11) && (
                                    <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                                        {i === 11 ? 'Now' : `W-${11 - i}`}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── PRs & 1RM ───────────────────────────────────── */}
            <div style={{
                background: 'var(--surface)',
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                marginBottom: '24px'
            }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🏆 Personal Records
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Best set + estimated 1RM (Epley)
                </p>

                {allPRs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        {t('Log some workouts to see your PRs!')}
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {displayedPRs.map((pr, i) => {
                                const hasPlateau = detectPlateau(history || [], pr.exerciseId);
                                return (
                                    <motion.div
                                        key={pr.exerciseId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 14px',
                                            background: pr.isRecent ? 'rgba(250,255,0,0.04)' : 'var(--background)',
                                            borderRadius: 'var(--radius-md)',
                                            border: `1px solid ${pr.isRecent ? 'rgba(250,255,0,0.15)' : 'var(--border)'}`,
                                        }}
                                    >
                                        {/* Rank */}
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', width: '18px', textAlign: 'center', flexShrink: 0 }}>
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                                        </span>

                                        {/* Exercise Name */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {pr.exerciseName}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {pr.weight}kg × {pr.reps} {t('reps')}
                                                {hasPlateau && (
                                                    <span style={{ marginLeft: '8px', color: '#f59e0b', fontSize: '0.68rem' }}>
                                                        ⚠ Plateau
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 1RM + Badge */}
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: '1rem', fontWeight: '800', color: pr.isRecent ? 'var(--primary)' : 'var(--foreground)' }}>
                                                {pr.estimated1RM}kg
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                                                {pr.reps === 1 ? 'actual 1RM' : 'est. 1RM'}
                                                {pr.isRecent && ' ▲'}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {allPRs.length > 5 && (
                            <button
                                onClick={() => setShowAllPRs(v => !v)}
                                style={{
                                    marginTop: '12px', width: '100%', padding: '10px',
                                    background: 'transparent', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                                    fontSize: '0.85rem', cursor: 'pointer'
                                }}
                            >
                                {showAllPRs ? `▲ Show less` : `▼ Show all ${allPRs.length} PRs`}
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* ── MUSCLE SPLIT ────────────────────────────────── */}
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
                                <div style={{ width: '100%', height: '8px', background: 'var(--surface-highlight)', borderRadius: '100px', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(m.count / Math.max(...muscleSplit.map(x => x.count))) * 100}%` }}
                                        transition={{ duration: 0.8, delay: i * 0.08 }}
                                        style={{ height: '100%', background: i % 2 === 0 ? 'var(--primary)' : 'var(--brand-blue)', borderRadius: '100px' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── FUN STATS ────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <StatCard icon="🔥" value={user?.streak || 0} label={t('Day Streak')} />
                <StatCard icon="🏋️" value={user?.lifetime_workouts || 0} label={t('Lifetime Sessions')} />
                <StatCard icon="🏆" value={allPRs.length} label="Total PRs" />
                <StatCard icon="📈" value={allPRs.filter(p => p.isRecent).length} label="New PRs (30d)" accent />
            </div>
        </div>
    );
}

function StatCard({ icon, value, label, accent = false }) {
    return (
        <div style={{
            background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-md)',
            textAlign: 'center', border: `1px solid ${accent ? 'rgba(250,255,0,0.2)' : 'var(--border)'}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}>
            <div style={{ fontSize: '2rem' }}>{icon}</div>
            <div style={{ fontWeight: '900', fontSize: '1.5rem', color: accent ? 'var(--primary)' : '#fff' }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
        </div>
    );
}
