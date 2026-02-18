"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import Confetti from 'react-confetti'; // Lazy load this
import dynamic from 'next/dynamic';
import { useTranslation } from '@/context/TranslationContext';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

export default function WorkoutSummary({ data, onContinue }) {
    const { t } = useTranslation();
    const [showConfetti, setShowConfetti] = useState(false);
    const [progress, setProgress] = useState(0);

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
        // Animate progress bar (mock calculation for now, assuming 1000 XP per level for simplicity or use real math if we had it)
        // Let's assume Level N requires N * 1000 XP total? Or linear?
        // Let's just visualize the LAST chunk.
        // For visual, we can just fill it to 100%.
        const timer = setTimeout(() => setProgress(didLevelUp ? 100 : 60), 500);
        return () => clearTimeout(timer);
    }, [didLevelUp]);

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
                    {data.analysis && data.analysis.newRecords && data.analysis.newRecords.length > 0 && (
                        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                            {data.analysis.newRecords.map((rec, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 + (idx * 0.1) }}
                                    style={{
                                        background: 'linear-gradient(to right, rgba(251, 191, 36, 0.1), transparent)',
                                        borderLeft: '4px solid #fbbf24',
                                        padding: '12px',
                                        marginBottom: '8px',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fbbf24' }}>🏆 NEW RECORD</div>
                                    <div style={{ fontSize: '1rem', color: '#fff' }}>
                                        {/* We need exercise name, let's assume we can fetch or pass it. For now, ID */}
                                        {/* Ideally the store passed the name. Let's fallback to "Exercise" if missing */}
                                        Exercise Logged: {rec.value}kg <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(Prev: {rec.previous}kg)</span>
                                    </div>
                                </motion.div>
                            ))}
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
                                    <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>+{item.value}</span>
                                </div>
                            ))}
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
