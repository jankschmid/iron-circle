"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/context/TranslationContext';
import DynamicMuscleMap from '@/components/muscles/DynamicMuscleMap';
import { calculateWorkoutImpact } from '@/lib/muscleEngine/calculateWorkoutImpact';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

export default function WorkoutSummary({ data, onContinue }) {
    const { t } = useTranslation();
    const [showConfetti, setShowConfetti] = useState(false);
    const [progress, setProgress] = useState(0);
    const [muscleView, setMuscleView] = useState('front');
    const [muscleHeat, setMuscleHeat] = useState({});
    const [showMuscles, setShowMuscles] = useState(false);

    // Unpack data
    const {
        earnedXP = 0,
        newTotalXP = 0,
        newLevel = 1,
        didLevelUp = false,
        name,
        duration,
        volume
    } = data;

    useEffect(() => {
        if (didLevelUp) setShowConfetti(true);
        const timer = setTimeout(() => setProgress(didLevelUp ? 100 : 60), 500);
        return () => clearTimeout(timer);
    }, [didLevelUp]);

    // Calculate muscle heatmap from session exercises
    useEffect(() => {
        if (!data?.exercises?.length) return;
        const heat = calculateWorkoutImpact({ exercises: data.exercises });
        setMuscleHeat(heat);
        // Staggered entrance: reveal map after a short delay
        const t1 = setTimeout(() => setShowMuscles(true), 800);
        return () => clearTimeout(t1);
    }, [data]);

    // Auto-toggle front/rear every 3s once map is shown
    useEffect(() => {
        if (!showMuscles || Object.keys(muscleHeat).length === 0) return;
        const interval = setInterval(() => {
            setMuscleView(v => v === 'front' ? 'rear' : 'front');
        }, 3000);
        return () => clearInterval(interval);
    }, [showMuscles, muscleHeat]);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px',
                    padding: '40px 24px',
                    maxWidth: '400px',
                    width: '100%',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Glowing Background Effect */}
                <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '300px',
                    height: '300px',
                    background: didLevelUp ? 'var(--primary)' : 'var(--accent)',
                    filter: 'blur(100px)',
                    opacity: 0.15,
                    zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h2 style={{
                        fontSize: '1.8rem',
                        fontWeight: '800',
                        marginBottom: '8px',
                        color: didLevelUp ? 'var(--primary)' : '#fff',
                        textShadow: didLevelUp ? '0 0 20px var(--primary)' : 'none'
                    }}>
                        {didLevelUp ? t("LEVEL UP!") : t("WORKOUT COMPLETE!")}
                    </h2>

                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                        {name}
                    </p>

                    {/* Level Badge & Progress */}
                    <div style={{ marginBottom: '32px', position: 'relative', display: 'inline-block' }}>
                        {/* Circle Progress (SVG) */}
                        <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                            <circle
                                cx="80" cy="80" r="70"
                                stroke="var(--surface-highlight)"
                                strokeWidth="12"
                                fill="none"
                            />
                            <motion.circle
                                cx="80" cy="80" r="70"
                                stroke={didLevelUp ? 'var(--primary)' : 'var(--accent)'}
                                strokeWidth="12"
                                fill="none"
                                strokeDasharray="440"
                                strokeDashoffset={440 - (440 * progress) / 100}
                                strokeLinecap="round"
                                initial={{ strokeDashoffset: 440 }}
                                animate={{ strokeDashoffset: 440 - (440 * progress) / 100 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </svg>

                        {/* Center Content */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('LEVEL')}</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff' }}>{newLevel}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)', marginBottom: '4px' }}>
                            +{earnedXP} XP
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {t('Total XP')}: {newTotalXP}
                        </div>
                    </div>

                    {/* PR Celebration List */}
                    {data.analysis?.newRecords?.length > 0 && (
                        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                                Personal Records Broken 🏆
                            </div>
                            {data.analysis.newRecords.map((rec, idx) => {
                                const prMeta = {
                                    WEIGHT: { icon: '🏋️', label: 'Max Weight', fmt: v => `${v}kg` },
                                    E1RM: { icon: '💪', label: 'Estimated 1RM', fmt: v => `${v}kg` },
                                    VOLUME: { icon: '📦', label: 'Session Volume', fmt: v => `${v}kg` },
                                }[rec.type] || { icon: '⚡', label: rec.type, fmt: v => v };
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 + (idx * 0.1) }}
                                        style={{
                                            background: 'linear-gradient(to right, rgba(251,191,36,0.12), transparent)',
                                            borderLeft: '4px solid #fbbf24',
                                            padding: '10px 12px',
                                            marginBottom: '8px',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fbbf24' }}>
                                            {prMeta.icon} {prMeta.label} PR
                                        </div>
                                        <div style={{ fontSize: '0.95rem', color: '#fff', margin: '2px 0' }}>
                                            {rec.exerciseName || rec.exercise_id}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {prMeta.fmt(rec.old_value || rec.previous)} → <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{prMeta.fmt(rec.new_value || rec.value)}</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* Performance Trend Card */}
                    {data.analysis && (
                        <div style={{
                            marginBottom: '24px',
                            background: 'var(--surface-highlight)',
                            padding: '16px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Volume Trend</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {Math.abs(data.analysis.volumeDelta)}%
                                    {data.analysis.volumeDelta >= 0 ?
                                        <span style={{ color: 'var(--success)', marginLeft: '4px' }}>▲</span>
                                        : <span style={{ color: 'var(--error)', marginLeft: '4px' }}>▼</span>
                                    }
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>vs. Monthly Avg</div>
                            </div>
                            <div style={{ width: '1px', height: '40px', background: 'var(--border)' }} />
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Intensity</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>-</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Target</div>
                            </div>
                        </div>
                    )}

                    {/* Muscle Heatmap */}
                    {Object.keys(muscleHeat).length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={showMuscles ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                            style={{ marginBottom: '24px', textAlign: 'left' }}
                        >
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Muscle Impact</span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {['front', 'rear'].map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setMuscleView(v)}
                                            style={{
                                                padding: '2px 10px',
                                                borderRadius: '100px',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                border: 'none',
                                                cursor: 'pointer',
                                                background: muscleView === v ? 'var(--primary)' : 'var(--surface-highlight)',
                                                color: muscleView === v ? '#000' : 'var(--text-muted)',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            {v.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={muscleView}
                                        initial={{ opacity: 0, x: muscleView === 'front' ? -20 : 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: muscleView === 'front' ? 20 : -20 }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                    >
                                        <DynamicMuscleMap
                                            activeMuscles={muscleHeat}
                                            view={muscleView}
                                            animate={true}
                                            width={120}
                                            height={266}
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}

                    {/* Stats Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '32px',
                        borderRadius: '16px'
                    }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Duration')}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{Math.floor(duration / 60)}m</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Volume')}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{(volume / 1000).toFixed(1)}k kg</div>
                        </div>
                    </div>

                    {/* XP Breakdown */}
                    {data.breakdown && data.breakdown.length > 0 && (
                        <div style={{
                            marginBottom: '24px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'left'
                        }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>XP Breakdown</div>
                            {data.breakdown.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem' }}>
                                    <span style={{ color: item.isFrozen ? '#60a5fa' : 'var(--text-muted)' }}>{item.label}</span>
                                    <span style={{ color: item.isFrozen ? '#60a5fa' : 'var(--success)', fontWeight: 'bold' }}>
                                        {item.isFrozen ? '❄️ 0' : `+${item.value}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Streak Card */}
                    {data.streak && (
                        <div style={{
                            marginBottom: '24px',
                            background: data.streak.wasFrozen
                                ? 'rgba(96,165,250,0.08)'
                                : data.streak.count >= 5
                                    ? 'rgba(251,191,36,0.08)'
                                    : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${data.streak.wasFrozen ? '#60a5fa44' : data.streak.count >= 5 ? '#fbbf2444' : 'var(--border)'}`,
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'left'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                                    {data.streak.wasFrozen ? '❄️' : data.streak.count >= 20 ? '🔥' : data.streak.count >= 5 ? '🔥' : '💪'}
                                    {' '}{data.streak.count}-Day Streak
                                </div>
                                <div style={{
                                    background: data.streak.wasFrozen ? '#60a5fa22' : 'var(--surface-highlight)',
                                    color: data.streak.wasFrozen ? '#60a5fa' : data.streak.multiplier >= 1.5 ? '#fbbf24' : 'var(--text-muted)',
                                    padding: '4px 10px',
                                    borderRadius: '100px',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                }}>
                                    {data.streak.wasFrozen ? '0x (Frozen)' : `${data.streak.multiplier}x`}
                                </div>
                            </div>

                            {data.streak.wasFrozen && (
                                <div style={{ fontSize: '0.82rem', color: '#60a5fa', marginBottom: '6px' }}>
                                    ❄️ Streak was frozen — no XP multiplier this session. Streak protected!
                                </div>
                            )}
                            {data.streak.streakBroken && !data.streak.wasFrozen && (
                                <div style={{ fontSize: '0.82rem', color: 'var(--warning)', marginBottom: '6px' }}>
                                    ⚠️ Previous streak ended. A new one begins today!
                                </div>
                            )}
                            {data.streak.bonusXP > 0 && (
                                <div style={{ fontSize: '0.85rem', color: '#fbbf24' }}>
                                    +{data.streak.bonusXP} XP streak bonus
                                </div>
                            )}
                            {data.streak.longest > 1 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                    Longest streak: {data.streak.longest} days
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={onContinue}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: didLevelUp ? 'var(--primary)' : 'var(--accent)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '16px',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            cursor: 'pointer',
                            boxShadow: didLevelUp ? '0 0 30px rgba(50, 255, 126, 0.3)' : '0 0 30px rgba(125, 95, 255, 0.3)',
                            transform: 'scale(1)',
                            transition: 'transform 0.2s'
                        }}
                    >
                        {t('CONTINUE')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
