"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';
import ExerciseLogger from './ExerciseLogger';
import BottomNav from './BottomNav';

export default function WorkoutActive() {
    const { activeWorkout, finishWorkout, cancelWorkout, logSet, getExerciseHistory, getExercisePR, exercises, addSetToWorkout, removeSetFromWorkout } = useStore();
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);

    if (!activeWorkout) return null;

    const handleFinish = () => {
        finishWorkout({ visibility: isPrivate ? 'private' : 'public' });
        setShowFinishConfirm(false);
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
                        onClick={cancelWorkout}
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

            {/* Confirmation Modal */}
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
                    const lastSets = getExerciseHistory(log.exerciseId); // Now returns array of sets or null
                    const pr = getExercisePR(log.exerciseId);

                    return (
                        <div key={log.exerciseId + index}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{exerciseDef?.name || 'Unknown'}</h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                                    {pr ? `🏆 PR: ${pr}kg` : 'No PR yet'}
                                </span>
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
                                <div>RIR</div>
                                <div></div>
                            </div>

                            {/* Sets */}
                            {log.sets.map((set, setIndex) => {
                                // Find correct previous set for this index
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

            <BottomNav />
        </div>
    );
}
