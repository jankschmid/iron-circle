"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/context/TranslationContext';
import DynamicMuscleMap from '@/components/muscles/DynamicMuscleMap';
import { calculateWorkoutImpact } from '@/lib/muscleEngine/calculateWorkoutImpact';
import { useStore } from '@/lib/store';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

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

// Reusable Intensity Component
function MuscleBar({ muscleKey, intensity }) {
    const formattedName = muscleKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const pct = Math.min(100, Math.max(0, intensity * 100));

    let color = 'var(--text-muted)';
    if (pct > 70) color = 'var(--accent)'; // High Fatigue
    if (pct > 90) color = 'var(--primary)'; // Absolute failure

    return (
        <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold' }}>{formattedName}</span>
                <span style={{ color }}>{Math.round(pct)}% Fatigued</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--surface)', borderRadius: '100px', overflow: 'hidden' }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    style={{
                        height: '100%',
                        background: color,
                        borderRadius: '100px',
                        boxShadow: pct > 85 ? `0 0 10px ${color}` : 'none'
                    }}
                />
            </div>
        </div>
    );
}

export default function WorkoutSummary({ data, onContinue }) {
    const { t } = useTranslation();
    const { exercises } = useStore();
    const [showConfetti, setShowConfetti] = useState(false);
    const [progress, setProgress] = useState(0);
    const [muscleView, setMuscleView] = useState('front');
    const [muscleHeat, setMuscleHeat] = useState({});
    
    const scrollContainerRef = useRef(null);
    const [activeSlide, setActiveSlide] = useState(0);

    const {
        earnedXP = 0, newTotalXP = 0, newLevel = 1, didLevelUp = false,
        name, duration, volume
    } = data;

    useEffect(() => {
        if (didLevelUp) setShowConfetti(true);
        const timer = setTimeout(() => setProgress(didLevelUp ? 100 : 60), 500);
        return () => clearTimeout(timer);
    }, [didLevelUp]);

    // Calculate Heat
    useEffect(() => {
        if (!data?.exercises?.length) return;
        // Map data.exercises (completed logs) using the engine
        const heat = calculateWorkoutImpact({ logs: data.exercises }, exercises);
        setMuscleHeat(heat);
    }, [data, exercises]);

    // Format top muscles
    const sortedMuscles = Object.entries(groupMuscleHeat(muscleHeat))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    // Auto-scroll logic to reveal the heatmap
    useEffect(() => {
        const timer = setTimeout(() => {
            if (scrollContainerRef.current && activeSlide === 0) {
                // Scroll width of the container
                scrollContainerRef.current.scrollTo({
                    left: scrollContainerRef.current.clientWidth,
                    behavior: 'smooth'
                });
            }
        }, 4000); // Wait 4 seconds for user to digest XP
        return () => clearTimeout(timer);
    }, [activeSlide]);

    const handleScroll = (e) => {
        const slideIndex = Math.round(e.target.scrollLeft / e.target.clientWidth);
        setActiveSlide(slideIndex);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--background)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column'
        }}>
            {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

            {/* Pagination Dots Header */}
            <div style={{ padding: '40px 20px 20px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeSlide === 0 ? 'var(--primary)' : 'var(--surface-highlight)', transition: 'background 0.3s' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeSlide === 1 ? 'var(--primary)' : 'var(--surface-highlight)', transition: 'background 0.3s' }} />
            </div>

            {/* Scrollable Carousel */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    display: 'flex',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollSnapType: 'x mandatory',
                    scrollbarWidth: 'none', // Firefox
                    WebkitOverflowScrolling: 'touch',
                }}
                className="hide-scrollbar"
            >
                {/* --- SLIDE 1: REWARDS & GAMIFICATION --- */}
                <div style={{
                    minWidth: '100vw',
                    scrollSnapAlign: 'start',
                    padding: '0 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                }}>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}
                    >
                         {/* Glowing Background Effect */}
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            width: '300px', height: '300px', background: didLevelUp ? 'var(--primary)' : 'var(--accent)',
                            filter: 'blur(100px)', opacity: 0.15, zIndex: -1, pointerEvents: 'none'
                        }} />

                        <h2 style={{
                            fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px',
                            color: didLevelUp ? 'var(--primary)' : '#fff',
                            textShadow: didLevelUp ? '0 0 20px var(--primary)' : 'none'
                        }}>
                            {didLevelUp ? t("LEVEL UP!") : t("WORKOUT COMPLETE!")}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>{name}</p>

                        {/* Level Badge */}
                        <div style={{ marginBottom: '32px', position: 'relative', display: 'inline-block' }}>
                            <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="80" cy="80" r="70" stroke="var(--surface-highlight)" strokeWidth="12" fill="none" />
                                <motion.circle
                                    cx="80" cy="80" r="70"
                                    stroke={didLevelUp ? 'var(--primary)' : 'var(--accent)'} strokeWidth="12" fill="none"
                                    strokeDasharray="440" strokeDashoffset={440 - (440 * progress) / 100}
                                    strokeLinecap="round" initial={{ strokeDashoffset: 440 }}
                                    animate={{ strokeDashoffset: 440 - (440 * progress) / 100 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>{t('Level')}</div>
                                <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: '1', color: didLevelUp ? 'var(--primary)' : '#fff' }}>
                                    {newLevel}
                                </div>
                            </div>
                        </div>

                        {/* Basic Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: 'var(--surface-highlight)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Time')}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{Math.floor(duration / 60)}m</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('XP')}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>+{earnedXP}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Volume')}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{(volume / 1000).toFixed(1)}k</div>
                            </div>
                        </div>

                        {/* Streak Box */}
                        {data.streak && (
                            <div style={{
                                marginBottom: '24px', textAlign: 'left',
                                background: data.streak.wasFrozen ? 'rgba(96,165,250,0.08)' : data.streak.count >= 5 ? 'rgba(251,191,36,0.08)' : 'var(--surface-highlight)',
                                border: `1px solid ${data.streak.wasFrozen ? '#60a5fa44' : data.streak.count >= 5 ? '#fbbf2444' : 'var(--border)'}`,
                                borderRadius: '12px', padding: '16px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                                        {data.streak.wasFrozen ? '❄️' : data.streak.count >= 20 ? '🔥' : data.streak.count >= 5 ? '🔥' : '💪'}
                                        {' '}{data.streak.count}-Day Streak
                                    </div>
                                    <div style={{
                                        background: data.streak.wasFrozen ? '#60a5fa22' : 'var(--surface)',
                                        color: data.streak.wasFrozen ? '#60a5fa' : data.streak.multiplier >= 1.5 ? '#fbbf24' : 'var(--text-muted)',
                                        padding: '4px 10px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 'bold'
                                    }}>
                                        {data.streak.wasFrozen ? '0x (Frozen)' : `${data.streak.multiplier}x`}
                                    </div>
                                </div>
                                {data.streak.bonusXP > 0 && <div style={{ fontSize: '0.85rem', color: '#fbbf24' }}>+{data.streak.bonusXP} XP streak bonus</div>}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* --- SLIDE 2: MUSCLE IMPACT & HEATMAP --- */}
                <div style={{
                    minWidth: '100vw',
                    scrollSnapAlign: 'start',
                    padding: '0 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                }}>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        style={{ width: '100%', maxWidth: '400px', textAlign: 'left' }}
                    >
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>
                            {t("Muscle Impact")}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                            {t("See exactly which fibers you destroyed today.")}
                        </p>

                        <div style={{ background: 'var(--surface-highlight)', borderRadius: '24px', padding: '24px', position: 'relative', marginBottom: '24px' }}>
                            
                            {/* Toggle Front/Rear */}
                           <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '4px', background: 'var(--surface)', padding: '2px', borderRadius: '100px', zIndex: 10 }}>
                                {['front', 'rear'].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setMuscleView(v)}
                                        style={{
                                            padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                                            background: muscleView === v ? 'var(--primary)' : 'transparent',
                                            color: muscleView === v ? '#000' : 'var(--text-muted)',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        {v.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {/* 3D Map */}
                            <div style={{ display: 'flex', justifyContent: 'center', height: '260px', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '250px', height: '250px', background: 'var(--primary)', opacity: '0.05', filter: 'blur(40px)', borderRadius: '50%', pointerEvents: 'none' }} />
                                <AnimatePresence mode="wait">
                                    <motion.div key={muscleView} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35 }}>
                                        <DynamicMuscleMap activeMuscles={muscleHeat} view={muscleView} animate={true} width={130} height={260} />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Top Muscles List */}
                         {sortedMuscles.length > 0 && (
                            <div style={{ background: 'var(--surface-highlight)', borderRadius: '24px', padding: '24px' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>{t("Top Fatigued Muscles")}</h3>
                                {sortedMuscles.map(([mId, intensity]) => (
                                    <MuscleBar key={mId} muscleKey={mId} intensity={intensity} />
                                ))}
                            </div>
                        )}
                        {sortedMuscles.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                {t("No muscle impact logged. Try adding exercises with tracked sets!")}
                            </div>
                        )}
                        
                    </motion.div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div style={{ padding: '20px 24px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', background: 'var(--background)' }}>
                <button
                    onClick={onContinue}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: 'var(--primary)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '16px',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        boxShadow: didLevelUp ? '0 0 30px rgba(50, 255, 126, 0.3)' : '0 0 30px rgba(125, 95, 255, 0.3)'
                    }}
                >
                    {t('CONTINUE')}
                </button>
            </div>
        </div>
    );
}
