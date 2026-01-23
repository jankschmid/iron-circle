"use client";

import { useStore } from '@/lib/store';
import ExerciseLogger from './ExerciseLogger';
import BottomNav from './BottomNav';

export default function WorkoutActive() {
    const { activeWorkout, finishWorkout, logSet, getExerciseHistory, exercises } = useStore();

    if (!activeWorkout) return null;

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
                <button
                    onClick={finishWorkout}
                    style={{
                        background: 'var(--warning)',
                        color: '#000',
                        padding: '8px 16px',
                        borderRadius: '100px',
                        fontWeight: '700',
                        fontSize: '0.9rem'
                    }}
                >
                    FINISH
                </button>
            </header>

            {/* Exercise List */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {activeWorkout.logs.map((log, index) => {
                    const exerciseDef = exercises.find(e => e.id === log.exerciseId);
                    const history = getExerciseHistory(log.exerciseId);

                    return (
                        <div key={log.exerciseId + index}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{exerciseDef?.name || 'Unknown'}</h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>History: {history ? `${history.lastWeight}kg x ${history.lastReps}` : 'New'}</span>
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

                            {/* Sets */}
                            {log.sets.map((set, setIndex) => (
                                <ExerciseLogger
                                    key={setIndex}
                                    exerciseId={log.exerciseId}
                                    setId={setIndex}
                                    previousData={history}
                                    onLog={(data) => logSet(log.exerciseId, setIndex, data)}
                                    // Pass pre-filled reps if available (from template)
                                    initialReps={set.reps}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>

            <BottomNav />
        </div>
    );
}
