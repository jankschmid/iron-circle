"use client";

import { useStore } from '@/lib/store';
import { useTranslation } from '@/context/TranslationContext';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DynamicMuscleMap from './muscles/DynamicMuscleMap';

export default function StatsView() {
    const { history, exercises, user, getWorkoutHeat } = useStore();
    const { t } = useTranslation();

    // Calculate Streak based on history
    const calculateStreak = () => {
        if (!history || history.length === 0) return 0;
        const uniqueDays = new Set(history.map(s => s.endTime?.split('T')[0]).filter(Boolean));
        const sortedDays = [...uniqueDays].sort().reverse();
        
        let s = 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (sortedDays.includes(today) || sortedDays.includes(yesterday)) {
            s = 1;
            let checkDate = new Date(sortedDays.includes(today) ? today : yesterday);
            for (let i = 1; i < sortedDays.length; i++) {
                checkDate.setDate(checkDate.getDate() - 1);
                if (sortedDays.includes(checkDate.toISOString().split('T')[0])) s++;
                else break;
            }
        }
        return user?.current_streak || s; // Favor DB streak
    };

    const streak = calculateStreak();

    // Overall Totals
    const totalWorkouts = history ? history.length : 0;
    const totalVolume = history ? history.reduce((acc, s) => acc + (s.volume || 0), 0) : 0;
    const totalTimeHours = history ? Math.round(history.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600) : 0; // assuming duration is in seconds, or minutes? If minutes: /60. Previous was /6000 which implies deca-seconds?? Let's assume previous calculation was `duration` in seconds: / 3600.
    
    // Previous calc: Math.round(totalVolume / 6000) was for Time Trained. Wait, `totalVolume` was used for Time Trained in original code: `Math.round(totalVolume / 6000)`. That was a bug!
    const timeTrainedHours = history ? Math.round(history.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600) : 0;

    // Consistency Tracker (Last 7 Days)
    const getLast7Days = () => {
        const days = [];
        const today = new Date();
        today.setHours(0,0,0,0);
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const trained = history && history.some(s => s.endTime && s.endTime.startsWith(dateStr));
            days.push({
                date: d,
                trained,
                label: t(['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()])
            });
        }
        return days;
    };
    
    const last7Days = getLast7Days();
    const trainedDaysThisWeek = last7Days.filter(d => d.trained).length;

    // Recent Heatmap Carousel
    const recentSessions = history?.slice(0, 3) || [];
    const [heatmapIndex, setHeatmapIndex] = useState(0);

    useEffect(() => {
        if (recentSessions.length <= 1) return;
        const interval = setInterval(() => {
            setHeatmapIndex(prev => (prev + 1) % recentSessions.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [recentSessions.length]);

    return (
        <div style={{ paddingBottom: '20px' }}>
            {/* Recent Workout Heatmap Carousel */}
            {recentSessions.length > 0 && (
                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>🔥 {t('Recent Impact')}</h3>
                    </div>
                    
                    <div style={{
                        background: 'var(--surface)',
                        padding: '24px 20px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border)',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '400px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '380px', height: '380px', background: 'var(--primary)', opacity: '0.08', filter: 'blur(50px)', borderRadius: '50%', pointerEvents: 'none' }} />
                        
                        <AnimatePresence mode="wait">
                            {recentSessions.map((session, index) => {
                                if (index !== heatmapIndex) return null;
                                const date = new Date(session.endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                const heat = getWorkoutHeat(session);
                                
                                return (
                                    <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.4 }}
                                        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                    >
                                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)' }}>{session.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{date}</div>
                                        </div>
                                        
                                        <div style={{ height: '300px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                                            <DynamicMuscleMap
                                                activeMuscles={heat}
                                                view="front"
                                                animate={true}
                                                width={160}
                                                height={300}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Pagination Dots */}
                        {recentSessions.length > 1 && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', zIndex: 10 }}>
                                {recentSessions.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setHeatmapIndex(i)}
                                        style={{
                                            width: '8px', height: '8px', borderRadius: '50%', border: 'none', padding: 0,
                                            background: i === heatmapIndex ? 'var(--primary)' : 'var(--surface-highlight)',
                                            transition: 'all 0.3s', cursor: 'pointer',
                                            boxShadow: i === heatmapIndex ? '0 0 10px rgba(250,255,0,0.5)' : 'none'
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Consistency Tracker */}
            <section style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{t('7-Day Consistency')}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>{trainedDaysThisWeek}/7 {t('Days')}</span>
                </div>
                
                <div style={{
                    background: 'var(--surface)',
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {last7Days.map((day, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: day.trained ? 'var(--primary)' : 'var(--surface-highlight)',
                                border: day.trained ? 'none' : '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: day.trained ? '#000' : 'transparent',
                                fontSize: '0.9rem',
                                boxShadow: day.trained ? '0 0 12px rgba(217, 119, 6, 0.4)' : 'none',
                                transition: 'all 0.3s'
                            }}>
                                {day.trained ? '✓' : ''}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: day.trained ? 'var(--text-main)' : 'var(--text-dim)', fontWeight: day.trained ? 'bold' : 'normal' }}>
                                {day.label}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Premium Stats Grid */}
            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>{t('Lifetime Overview')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <StatGlass label={t('Total Workouts')} value={totalWorkouts} icon="🏋️‍♂️" />
                    <StatGlass label={t('Time Trained')} value={timeTrainedHours} icon="⏱️" suffix="h" />
                    <StatGlass label={t('Total Volume')} value={(totalVolume / 1000).toFixed(1)} icon="📊" suffix="k" />
                    <StatGlass label={t('Current Streak')} value={streak} icon="🔥" suffix={t('days')} glow={true} />
                </div>
            </section>

            {/* Recent Sessions List */}
            {history && history.length > 0 && (
                <section>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{t('Recent Sessions')}</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {history.slice(0, 3).map((session) => {
                            const date = new Date(session.endTime);
                            const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            const durationMins = Math.round((session.duration || 0) / 60);
                            
                            return (
                                <div key={session.id} style={{
                                    background: 'var(--surface)',
                                    padding: '16px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px' }}>{session.name || 'Workout'}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dateStr} • {durationMins} {t('min')}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                                            {session.volume ? `${(session.volume / 1000).toFixed(1)}k kg` : '-'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('Volume')}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}

function StatGlass({ label, value, icon, suffix, glow = false }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            style={{
            background: glow ? 'linear-gradient(145deg, rgba(217, 119, 6, 0.1) 0%, rgba(0,0,0,0) 100%)' : 'var(--surface)',
            padding: '24px 20px',
            borderRadius: '20px',
            border: glow ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        }}>
            {glow && <div style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, background: 'var(--primary)', filter: 'blur(40px)', opacity: 0.3 }} />}
            <span style={{ fontSize: '1.8rem', marginBottom: '12px', display: 'block' }}>{icon}</span>
            <div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: glow ? 'var(--primary)' : 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    {value}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600' }}>{suffix}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', marginTop: '4px' }}>{label}</div>
            </div>
        </motion.div>
    );
}
