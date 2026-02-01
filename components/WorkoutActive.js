"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';
import ExerciseLogger from './ExerciseLogger';
import BottomNav from './BottomNav';
import ExercisePicker from './ExercisePicker';
import ConfirmationModal from './ConfirmationModal';
import { getSmartSuggestion } from '@/lib/algorithms';

export default function WorkoutActive() {
    const {
        activeWorkout,
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
        user
    } = useStore();

    const [showFinishConfirm, setShowFinishConfirm] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    // Generic Confirmation State
    const [confirmAction, setConfirmAction] = useState(null); // { title, message, onConfirm, isDangerous, confirmText }



    if (!activeWorkout) return null;

    const handleFinish = () => {
        finishWorkout({ visibility: isPrivate ? 'private' : 'public' });
        setShowFinishConfirm(false);
    };

    const handleCancel = () => {
        setConfirmAction({
            title: "Cancel Workout?",
            message: "Are you sure you want to cancel? This will discard all progress for this session.",
            onConfirm: () => {
                cancelWorkout();
                setConfirmAction(null);
            },
            isDangerous: true,
            confirmText: "Discard Workout"
        });
    };

    const handleRemoveExercise = (log) => {
        const exerciseDef = exercises.find(e => e.id === log.exerciseId);
        setConfirmAction({
            title: `Remove ${exerciseDef?.name || 'Exercise'}?`,
            message: "This will remove the exercise and all its sets from the current session.",
            onConfirm: () => {
                removeExerciseFromWorkout(log.exerciseId);
                setConfirmAction(null);
            },
            isDangerous: true,
            confirmText: "Remove"
        });
    };

    return (
        <div className="container" style={{ paddingBottom: '120px' }}>
            {/* Header */}
            <header style={{
                padding: '20px 0',
                borderBottom: '1px solid var(--border)',
                position: 'sticky',
                top: 0,
                background: 'var(--background)',
                zIndex: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem' }}>{activeWorkout.name}</h2>
                    <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>● Live Session</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleCancel}
                        style={{
                            background: 'transparent',
                            color: 'var(--error)',
                            padding: '8px 12px',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            border: '1px solid var(--error)',
                            borderRadius: '100px'
                        }}
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={() => setShowFinishConfirm(true)}
                        style={{
                            background: 'var(--warning)',
                            color: '#000',
                            padding: '8px 16px',
                            borderRadius: '100px',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            border: 'none'
                        }}
                    >
                        FINISH
                    </button>
                </div>
            </header>

            {/* Finish Confirmation Modal (Custom because of Checkbox) */}
            {showFinishConfirm && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--surface)',
                        padding: '24px',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '320px',
                        textAlign: 'center',
                        border: '1px solid var(--border)'
                    }}>
                        <h3 style={{ marginBottom: '16px' }}>Finish Workout?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Are you sure you want to finish and save this session?
                        </p>

                        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--surface-highlight)', padding: '12px', borderRadius: '8px' }}>
                            <input
                                type="checkbox"
                                id="privateCheck"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    accentColor: 'var(--primary)',
                                    cursor: 'pointer'
                                }}
                            />
                            <label htmlFor="privateCheck" style={{ color: 'var(--text-main)', cursor: 'pointer', fontWeight: '500', display: 'flex', flexDirection: 'column' }}>
                                <span>Ghost Mode 👻</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Hide from feed & leaderboards</span>
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowFinishConfirm(false)}
                                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinish}
                                style={{ flex: 1, padding: '12px', background: 'var(--success)', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Finish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exercise List */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {activeWorkout.logs.map((log, index) => {
                    const exerciseDef = exercises.find(e => e.id === log.exerciseId);
                    const lastSets = getExerciseHistory(log.exerciseId);
                    const pr = getExercisePR(log.exerciseId);

                    return (
                        <div key={log.exerciseId + index}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>{exerciseDef?.name || 'Unknown'}</h3>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                                        {pr ? `🏆 PR: ${pr}kg` : ''}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveExercise(log)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
                                        title="Remove Exercise"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Table Header */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(50px, 1fr) minmax(50px, 1fr) minmax(40px, 1fr) 40px',
                                gap: '8px',
                                marginBottom: '8px',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                textAlign: 'center'
                            }}>
                                <div>KG</div>
                                <div>REPS</div>
                                <div>RPE</div>
                                <div></div>
                            </div>

                            {/* Smart Suggestion UI */}
                            {lastSets && (() => {
                                // Check preference
                                const enabled = user?.user_metadata?.preferences?.smart_suggestions ?? true;
                                if (!enabled) return null;

                                // Calculate suggestion once per exercise render
                                const suggestion = getSmartSuggestion(lastSets);
                                if (!suggestion || !suggestion.weight) return null;

                                return (
                                    <div style={{
                                        margin: '0 0 12px 0',
                                        padding: '8px 12px',
                                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.05), transparent)',
                                        borderLeft: '3px solid var(--accent)',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        fontSize: '0.85rem'
                                    }}>
                                        <div>
                                            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>⚡ Smart Goal: </span>
                                            <span style={{ color: '#fff' }}>{suggestion.weight}kg x {suggestion.reps}</span>
                                            {suggestion.type === 'deload' && <span style={{ marginLeft: '8px', color: 'var(--success)', fontSize: '0.75rem', border: '1px solid var(--success)', padding: '2px 6px', borderRadius: '100px' }}>DELOAD</span>}
                                        </div>
                                        <button
                                            onClick={() => {
                                                // Apply to all empty sets? Or just the next one?
                                                // Let's apply to the first empty set or the last one if all full
                                                // Actually, simpler: Apply to the NEWLY added set if it exists, or update the last one.
                                                // For now, let's just use existing logic to find target set.
                                                // User asked for "Magic Button" to auto-fill.
                                                // We can trigger a specific action or just expose this to the user to manually input for now?
                                                // Better: "Click to Apply" -> fills the *next* incomplete set.

                                                // Find first incomplete set
                                                const nextSetIndex = log.sets.findIndex(s => !s.completed && (!s.weight || !s.reps));
                                                if (nextSetIndex !== -1) {
                                                    logSet(log.exerciseId, nextSetIndex, { weight: suggestion.weight, reps: suggestion.reps });
                                                } else {
                                                    // Params are passed to addSetToWorkout? No, addSet adds empty.
                                                    // We can add a set AND fill its data.
                                                    addSetToWorkout(log.exerciseId);
                                                    setTimeout(() => {
                                                        // We need to wait for state update to know the index, but we know it's length
                                                        logSet(log.exerciseId, log.sets.length, { weight: suggestion.weight, reps: suggestion.reps });
                                                    }, 50);
                                                }
                                            }}
                                            style={{
                                                background: 'var(--accent)',
                                                color: '#000',
                                                border: 'none',
                                                padding: '4px 12px',
                                                borderRadius: '100px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                marginLeft: 'auto'
                                            }}
                                        >
                                            APPLY
                                        </button>
                                    </div>
                                );
                            })()}

                            {/* Sets */}
                            {log.sets.map((set, setIndex) => {
                                const prevSet = lastSets && lastSets[setIndex] ? lastSets[setIndex] : null;
                                const previousData = prevSet ? { lastWeight: prevSet.weight, lastReps: prevSet.reps } : null;

                                return (
                                    <ExerciseLogger
                                        key={set.id || setIndex}
                                        exerciseId={log.exerciseId}
                                        setId={setIndex}
                                        previousData={previousData}
                                        initialData={set}
                                        onLog={(data) => logSet(log.exerciseId, setIndex, data)}
                                    />
                                );
                            })}

                            {/* Add/Remove Set Buttons */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <button
                                    onClick={() => addSetToWorkout(log.exerciseId)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: 'var(--surface-highlight)',
                                        color: 'var(--primary)',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    + Add Set
                                </button>
                                <button
                                    onClick={() => removeSetFromWorkout(log.exerciseId, log.sets.length - 1)}
                                    disabled={log.sets.length <= 1}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: 'var(--surface-highlight)',
                                        color: log.sets.length <= 1 ? 'var(--text-muted)' : 'var(--warning)',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        opacity: log.sets.length <= 1 ? 0.3 : 1,
                                        pointerEvents: log.sets.length <= 1 ? 'none' : 'auto',
                                        cursor: 'pointer'
                                    }}
                                >
                                    - Remove Set
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Exercise Button */}
            <button
                onClick={() => setShowPicker(true)}
                style={{
                    width: '100%',
                    padding: '16px',
                    marginTop: '32px',
                    background: 'transparent',
                    border: '1px dashed var(--primary)',
                    color: 'var(--primary)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '600',
                    fontSize: '1rem',
                    cursor: 'pointer'
                }}
            >
                + Add Exercise
            </button>

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

            {/* Generic Confirmation Modal (Remove Ex / Cancel Workout) */}
            <ConfirmationModal
                isOpen={!!confirmAction}
                onCancel={() => setConfirmAction(null)}
                {...confirmAction}
            />

            <BottomNav />
        </div>
    );
}
