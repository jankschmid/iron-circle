"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '@/lib/store';
import ExerciseLogger from './ExerciseLogger';
import BottomNav from './BottomNav';
import ExercisePicker from './ExercisePicker';
import ConfirmationModal from './ConfirmationModal';
import { getSmartSuggestion } from '@/lib/algorithms';
import { motion } from 'framer-motion';

import Link from 'next/link'; // Added for Safety
import WarmupScreen from './WarmupScreen';
import { useTranslation } from '@/context/TranslationContext';

export default function WorkoutActive() {
    const {
        activeWorkout,
        setActiveWorkout,
        finishWorkout,
        cancelWorkout,
        logSet,
        getExerciseHistory,
        getExercisePR,
        exercises,
        addSetToWorkout,
        removeSetFromWorkout,
        addExerciseToWorkout,
        removeExerciseFromWorkout,
        user,
        activeAssignment // New
    } = useStore();

    const [showFinishConfirm, setShowFinishConfirm] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const { t } = useTranslation();

    // Strict Mode Check
    const isStrict = activeAssignment?.plan_id && activeWorkout?.planId === activeAssignment.plan_id && activeAssignment.settings?.is_strict;

    // Robust Mobile Scroll Focus State
    const [focusedIndex, setFocusedIndex] = useState(0);
    const scrollContainerRef = useRef(null);
    const cardRefs = useRef([]);

    useEffect(() => {
        if (!activeWorkout || activeWorkout.logs.length === 0) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Trigger line is 35% down the viewport height
            const triggerY = window.innerHeight * 0.35;
            let active = 0;

            // Explicit top trap: if near the top, always 0.
            if (container.scrollTop < 60) {
                active = 0;
            } else {
                cardRefs.current.forEach((el, index) => {
                    if (!el) return;
                    const rect = el.getBoundingClientRect();

                    // If the top of the card's non-sticky wrapper is above the trigger line,
                    // it is considered the current scroll position's active card.
                    // Since cards are iterated in order, the furthest one down that crossed the line wins.
                    if (rect.top <= triggerY) {
                        active = index;
                    }
                });
            }

            setFocusedIndex(prev => prev !== active ? active : prev);
        };

        // Attach listener
        container.addEventListener('scroll', handleScroll, { passive: true });

        // Initial evaluation after a brief layout pause
        const initTimeout = setTimeout(handleScroll, 50);

        return () => {
            container.removeEventListener('scroll', handleScroll);
            clearTimeout(initTimeout);
        };
    }, [activeWorkout]);

    // Initial Phase Logic
    const hasLogs = activeWorkout && activeWorkout.logs.some(l => l.sets.some(s => s.completed));
    const [phase, setPhase] = useState((hasLogs || activeWorkout?.warmupSkipped) ? 'workout' : 'warmup');

    // Generic Confirmation State
    const [confirmAction, setConfirmAction] = useState(null);

    // Timers
    const [currentTime, setCurrentTime] = useState(Date.now());
    useEffect(() => {
        if (!activeWorkout) return;
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [activeWorkout]);

    if (!activeWorkout) return null;

    // Calculate Timers
    const sessionDurationMs = Math.max(0, currentTime - new Date(activeWorkout.startTime).getTime());
    const sessionMins = Math.floor(sessionDurationMs / 60000);
    const sessionSecs = Math.floor((sessionDurationMs % 60000) / 1000);
    const formattedSessionTime = `${sessionMins}:${sessionSecs.toString().padStart(2, '0')}`;

    const lastCompletedAt = useMemo(() => {
        let maxTime = 0;
        activeWorkout.logs.forEach(log => {
            log.sets.forEach(s => {
                if (s.completed && s.completedAt && s.completedAt > maxTime) {
                    maxTime = s.completedAt;
                }
            });
        });
        return maxTime;
    }, [activeWorkout.logs, activeWorkout.lastActionTime]);

    let restTimeMs = 0;
    if (lastCompletedAt > 0) {
        restTimeMs = Math.max(0, currentTime - lastCompletedAt);
    }
    const restMins = Math.floor(restTimeMs / 60000);
    const restSecs = Math.floor((restTimeMs % 60000) / 1000);
    const formattedRestTime = `${restMins}:${restSecs.toString().padStart(2, '0')}`;

    let restMessage = "";
    let restColor = "var(--text-muted)";
    if (lastCompletedAt > 0) {
        if (restMins < 1) {
            restMessage = t("Great set! Catch your breath. 😮‍💨");
            restColor = "var(--text-muted)";
        } else if (restMins < 2) {
            restMessage = t("Ready for the next set? 🔥");
            restColor = "var(--primary)";
        } else if (restMins < 3) {
            restMessage = t("Time to lift! Let's go. ⚔️");
            restColor = "var(--warning)";
        } else {
            restMessage = t("Resting too long... wake up! 🚨");
            restColor = "var(--error)";
        }
    }

    if (phase === 'warmup') {
        const template = exercises.length > 0 ? {
            name: activeWorkout.name,
            exercises: activeWorkout.logs.map(l => ({ id: l.exerciseId }))
        } : { name: activeWorkout.name, exercises: [] };

        return <WarmupScreen
            template={template}
            onComplete={() => {
                setActiveWorkout({ ...activeWorkout, warmupSkipped: true });
                setPhase('workout');
            }}
        />;
    }

    const handleFinish = () => {
        finishWorkout({ visibility: isPrivate ? 'private' : 'public' });
        setShowFinishConfirm(false);
    };

    const handleCancel = () => {
        setConfirmAction({
            title: t("Cancel Workout?"),
            message: t("Are you sure you want to cancel? This will discard all progress for this session."),
            onConfirm: () => {
                cancelWorkout();
                setConfirmAction(null);
            },
            isDangerous: true,
            confirmText: t("Discard Workout")
        });
    };

    const handleRemoveExercise = (log) => {
        if (isStrict) return; // Guard
        const exerciseDef = exercises.find(e => e.id === log.exerciseId);
        setConfirmAction({
            title: `${t('Remove')} ${exerciseDef?.name || t('Exercise')}?`,
            message: t("This will remove the exercise and all its sets from the current session."),
            onConfirm: () => {
                removeExerciseFromWorkout(log.exerciseId);
                setConfirmAction(null);
            },
            isDangerous: true,
            isDangerous: true,
            confirmText: t("Remove")
        });
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--background)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            {/* Fixed Header */}
            <header style={{
                flexShrink: 0,
                padding: 'calc(20px + env(safe-area-inset-top)) 20px 20px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--background)'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {activeWorkout.name}
                        {isStrict && <span style={{ fontSize: '0.7rem', background: 'var(--error)', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>🔒 {t('STRICT')}</span>}
                    </h2>
                    <div style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%' }}></span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>{formattedSessionTime}</span>
                        <span>{t('Live')} {activeAssignment ? `(${t('Coached')})` : ''}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleCancel} style={{ background: 'transparent', color: 'var(--error)', padding: '8px 12px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', border: '1px solid var(--error)', borderRadius: '100px' }}>{t('CANCEL')}</button>
                    <button onClick={() => setShowFinishConfirm(true)} style={{ background: 'var(--warning)', color: '#000', padding: '8px 16px', borderRadius: '100px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', border: 'none' }}>{t('FINISH')}</button>
                </div>
            </header>

            {/* Scrollable Flow Container */}
            <div
                ref={scrollContainerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '0 20px 50vh 20px', // 50vh allows scrolling past the last element
                    position: 'relative',
                    scrollSnapType: 'y proximity',
                    scrollBehavior: 'smooth'
                }}>

                {/* Finish Modal (unchanged) */}
                {showFinishConfirm && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '320px', textAlign: 'center', border: '1px solid var(--border)' }}>
                            <h3 style={{ marginBottom: '16px' }}>{t('Finish Workout?')}</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{t('Are you sure you want to finish and save this session?')}</p>
                            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--surface-highlight)', padding: '12px', borderRadius: '8px' }}>
                                <input type="checkbox" id="privateCheck" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                                <label htmlFor="privateCheck" style={{ color: 'var(--text-main)', cursor: 'pointer', fontWeight: '500', display: 'flex', flexDirection: 'column' }}><span>{t('Ghost Mode')} 👻</span><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{t('Hide from feed & leaderboards')}</span></label>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowFinishConfirm(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer' }}>{t('Cancel')}</button>
                                <button onClick={handleFinish} style={{ flex: 1, padding: '12px', background: 'var(--success)', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>{t('Finish')}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Exercise List */}
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {(() => {
                        const activeIndex = focusedIndex === -1 ? 0 : focusedIndex;

                        return activeWorkout.logs.map((log, index) => {
                            // Ensure loose equality (==) in case exerciseId was saved as string but is int in DB, or vice versa
                            const exerciseDef = exercises.find(e => e.id == log.exerciseId);
                            const lastSets = getExerciseHistory(log.exerciseId);
                            const pr = getExercisePR(log.exerciseId);

                            const isActive = index === activeIndex;
                            const distance = Math.abs(index - activeIndex);

                            const blurAmount = isActive ? 0 : Math.min(distance * 3, 10);
                            const opacityAmount = isActive ? 1 : Math.max(1 - distance * 0.4, 0.2);
                            const scaleAmount = isActive ? 1 : Math.max(1 - distance * 0.05, 0.85);

                            return (
                                <div
                                    key={log.exerciseId + index}
                                    ref={el => cardRefs.current[index] = el}
                                    style={{
                                        position: 'relative',
                                        marginBottom: '60px', // Revert to smaller space, we don't want huge gaps
                                        scrollSnapAlign: 'start',
                                        scrollMarginTop: `${20 + (index * 8)}px`
                                    }}
                                >

                                    {/* The Sticky Card Container */}
                                    <div
                                        style={{
                                            position: 'sticky',
                                            top: `${20 + (index * 8)}px`,
                                            zIndex: 10 + index
                                        }}
                                    >
                                        <motion.div
                                            initial={{ opacity: 0.3, y: 80, filter: 'blur(8px)', scale: 0.85 }}
                                            animate={{ opacity: opacityAmount, y: 0, filter: `blur(${blurAmount}px)`, scale: scaleAmount }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                            style={{
                                                background: 'var(--surface)',
                                                padding: '20px',
                                                borderRadius: '16px',
                                                border: '1px solid var(--border)',
                                                boxShadow: '0 -8px 30px rgba(0,0,0,0.6)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>{exerciseDef?.name || 'Unknown'}</h3>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>{pr ? `🏆 PR: ${pr}kg` : ''}</span>
                                                    {!isStrict && (
                                                        <button onClick={() => handleRemoveExercise(log)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }} title="Remove Exercise">✕</button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Table Header */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(50px, 1fr) minmax(50px, 1fr) minmax(40px, 1fr) 40px', gap: '8px', marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                                <div>{t('KG')}</div>
                                                <div>{t('REPS')}</div>
                                                <div>{t('RPE')}</div>
                                                <div></div>
                                            </div>

                                            {/* Sets */}
                                            {log.sets.map((set, setIndex) => {
                                                const prevSet = lastSets && lastSets[setIndex] ? lastSets[setIndex] : null;
                                                const previousData = prevSet ? { lastWeight: prevSet.weight, lastReps: prevSet.reps } : null;

                                                const suggestion = (() => {
                                                    if (set.completed) return null;
                                                    const enabled = activeAssignment?.settings?.allow_algo ?? (user?.user_metadata?.preferences?.smart_suggestions ?? true);
                                                    if (!enabled) return null;

                                                    // Pass current log's target goal to algo
                                                    const algoContext = {
                                                        ...activeAssignment,
                                                        targetGoal: log.targetGoal, // Passed from Store > Template
                                                        exerciseDef: exerciseDef
                                                    };

                                                    const currentCompletedSets = log.sets.filter(s => s.completed);
                                                    const setsArray = currentCompletedSets.length > 0 ? currentCompletedSets : lastSets;

                                                    const s = getSmartSuggestion(setsArray, algoContext);
                                                    if (s) return s;
                                                    return null;
                                                })();

                                                return (
                                                    <ExerciseLogger
                                                        key={set.id || setIndex}
                                                        exerciseId={log.exerciseId}
                                                        setId={setIndex}
                                                        previousData={previousData}
                                                        initialData={set}
                                                        type={exerciseDef?.type || 'Strength'}
                                                        onLog={(data) => logSet(log.exerciseId, setIndex, data)}
                                                        suggestion={suggestion}
                                                    // strictMode could be passed here if we want to lock inputs, but we decided to just lock structure for now
                                                    />
                                                );
                                            })}

                                            {/* Add/Remove Set Buttons (Hidden in Strict Mode) */}
                                            {!isStrict && (
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                    <button onClick={() => addSetToWorkout(log.exerciseId)} style={{ flex: 1, padding: '8px', background: 'var(--surface-highlight)', color: 'var(--primary)', border: 'none', borderRadius: '4px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}>+ {t('Add Set')}</button>
                                                    <button onClick={() => removeSetFromWorkout(log.exerciseId, log.sets.length - 1)} disabled={log.sets.length <= 1} style={{ flex: 1, padding: '8px', background: 'var(--surface-highlight)', color: log.sets.length <= 1 ? 'var(--text-muted)' : 'var(--warning)', border: 'none', borderRadius: '4px', fontWeight: '600', fontSize: '0.9rem', opacity: log.sets.length <= 1 ? 0.3 : 1, pointerEvents: log.sets.length <= 1 ? 'none' : 'auto', cursor: 'pointer' }}>- {t('Remove Set')}</button>
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>

                {/* Add Exercise Button (Hidden in Strict Mode) */}
                {!isStrict && (
                    <button
                        onClick={() => setShowPicker(true)}
                        style={{ width: '100%', padding: '16px', marginTop: '32px', background: 'transparent', border: '1px dashed var(--primary)', color: 'var(--primary)', borderRadius: 'var(--radius-md)', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' }}
                    >
                        + {t('Add Exercise')}
                    </button>
                )}

                {/* Exercise Picker Modal */}
                {showPicker && (
                    <ExercisePicker
                        onSelect={(ex) => {
                            addExerciseToWorkout(ex.id);
                            setShowPicker(false);
                        }}
                        onCancel={() => setShowPicker(false)}
                    />
                )}

                {/* Workout Summary & Bottom Finish Button */}
                {!isStrict && (() => {
                    let totalSets = 0;
                    let completedSets = 0;
                    activeWorkout.logs.forEach(log => {
                        totalSets += log.sets.length;
                        completedSets += log.sets.filter(s => s.completed).length;
                    });

                    let message = "";
                    let color = "var(--text-muted)";

                    if (totalSets === 0) {
                        message = t("You haven't added any exercises yet.");
                    } else if (completedSets === 0) {
                        message = t("No sets logged yet. Let's get to work! 💪");
                    } else if (completedSets < totalSets) {
                        message = `${t("You have")} ${totalSets - completedSets} ${t("un-logged sets remaining. Sure you're done?")}`;
                        color = "var(--warning)";
                    } else {
                        message = t("All sets crushed! Outstanding work. Finish strong! 🏆");
                        color = "var(--success)";
                    }

                    return (
                        <div style={{ marginTop: '48px', padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: `1px solid ${color === 'var(--text-muted)' ? 'var(--border)' : color}`, textAlign: 'center' }}>
                            <p style={{ color, marginBottom: '16px', fontWeight: '500', fontSize: '1.05rem' }}>{message}</p>
                            <button
                                onClick={() => setShowFinishConfirm(true)}
                                style={{ width: '100%', padding: '16px', background: 'var(--warning)', color: '#000', borderRadius: '100px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                            >
                                {t('FINISH WORKOUT')}
                            </button>
                        </div>
                    );
                })()}

            </div> {/* End of Scrollable Flow Container */}

            {/* Generic Confirmation Modal (Remove Ex / Cancel Workout) */}
            <ConfirmationModal
                isOpen={!!confirmAction}
                onCancel={() => setConfirmAction(null)}
                {...confirmAction}
            />

            {/* Floating Progressive Rest Timer Pill */}
            {lastCompletedAt > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: '100px', /* More clearance above BottomNav */
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    background: restColor === 'var(--text-muted)' ? 'var(--surface-highlight)' : restColor,
                    color: restColor === 'var(--text-muted)' ? 'var(--text-main)' : '#000',
                    padding: '12px 24px',
                    borderRadius: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: `0 8px 25px ${restColor === 'var(--text-muted)' ? 'rgba(0,0,0,0.5)' : restColor + '66'}`,
                    border: 'none',
                    pointerEvents: 'none', /* Passthrough clicks */
                    transition: 'all 0.3s ease'
                }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        {restMessage}
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', fontVariantNumeric: 'tabular-nums' }}>
                        ⏱️ {formattedRestTime}
                    </div>
                </div>
            )}

            {/* Bottom Nav should definitely be over bottom scroll content */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 110 }}>
                <BottomNav />
            </div>
        </div>
    );
}
