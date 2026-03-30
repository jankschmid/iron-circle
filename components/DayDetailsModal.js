"use client";

import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import DynamicMuscleMap from './muscles/DynamicMuscleMap';
import { calculateTemplateImpact } from '@/lib/muscleEngine/calculateWorkoutImpact';
import { useTranslation } from '@/context/TranslationContext';

// Simple MuscleBar matching the website and StatsTab
function ModalMuscleBar({ id, intensity }) {
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

export default function DayDetailsModal({ templateId, activePlanId, dayId, onClose }) {
    const { t } = useTranslation();
    const { workoutTemplates, startWorkout, exercises } = useStore();
    const [predictiveHeat, setPredictiveHeat] = useState({});
    const [muscleView, setMuscleView] = useState('front');

    const template = workoutTemplates.find(t => t.id === templateId);

    useEffect(() => {
        if (template) {
            const heat = calculateTemplateImpact(template, exercises);
            setPredictiveHeat(heat);
        }
    }, [template, exercises]);

    if (!template) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
                style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '450px',
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    padding: '24px',
                    position: 'relative' // for button
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {t('Routine Preview')}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '0 8px' }}>
                        ×
                    </button>
                </div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', marginTop: 0 }}>{template.name}</h2>

                {/* Split Content on slightly larger screens, stacked on small */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Predictive Heatmap */}
                    <div style={{ background: 'var(--surface-highlight)', borderRadius: '16px', padding: '20px', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '4px', background: 'var(--surface)', padding: '2px', borderRadius: '100px', zIndex: 10 }}>
                            {['front', 'rear'].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setMuscleView(v)}
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: '100px',
                                        fontSize: '0.65rem',
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

                        <div style={{ display: 'flex', justifyContent: 'center', height: '350px', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', background: 'var(--primary)', opacity: '0.05', filter: 'blur(40px)', borderRadius: '50%', pointerEvents: 'none' }} />
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={muscleView}
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                >
                                    <DynamicMuscleMap
                                        activeMuscles={predictiveHeat}
                                        view={muscleView}
                                        animate={true}
                                        width={200}
                                        height={350}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        
                        {/* Legend / Muscle Bars */}
                        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-dim)', fontWeight: 'bold', marginBottom: '12px' }}>
                                {t('Primary Targets')}
                            </p>
                            <div>
                                {Object.entries(groupMuscleHeat(predictiveHeat))
                                    .filter(([, intensity]) => intensity > 0.1)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 4)
                                    .map(([id, intensity]) => (
                                        <ModalMuscleBar key={id} id={id} intensity={intensity} />
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Exercise List */}
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                            {template.exercises.length} {t('Exercises')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {template.exercises.map((ex, i) => {
                                    const exName = ex.name || exercises.find(e => e.id === ex.id)?.name || 'Unknown';
                                    
                                    // Bulletproof Sets/Reps Extractor
                                    let displaySets = 3;
                                    let displayReps = '8-12';
                                    
                                    if (Array.isArray(ex.sets)) {
                                        displaySets = ex.sets.length;
                                        displayReps = ex.sets[0]?.reps || displayReps;
                                    } else if (typeof ex.sets === 'object' && ex.sets !== null) {
                                        // Legacy or malformed single object `{ reps: 10 }`
                                        displaySets = 1;
                                        displayReps = ex.sets.reps || displayReps;
                                    } else if (ex.sets) {
                                        displaySets = String(ex.sets);
                                    }
                                    
                                    if (ex.targetReps && typeof ex.targetReps !== 'object') {
                                        displayReps = String(ex.targetReps);
                                    }

                                    return (
                                        <div key={i} style={{ display: 'flex', justifyItems: 'space-between', background: 'var(--surface-highlight)', padding: '12px 16px', borderRadius: '8px' }}>
                                            <div style={{ flex: 1, fontWeight: 'bold', fontSize: '0.9rem' }}>{exName}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {typeof displaySets === 'object' ? String(displaySets.reps || 1) : String(displaySets)} {t('sets')} • {typeof displayReps === 'object' ? String(displayReps.reps || 10) : String(displayReps)} {t('reps')}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div style={{ marginTop: '32px' }}>
                    <button
                        onClick={() => {
                            startWorkout(template.id, activePlanId, dayId);
                            onClose();
                        }}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--primary)',
                            color: 'black',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {t('Start Workout')} 🚀
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
