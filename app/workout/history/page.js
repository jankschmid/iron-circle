"use client";

import { useStore } from '@/lib/store';
import Link from 'next/link';
import { useState } from 'react';
import { EXERCISES } from '@/lib/data';

export default function HistoryPage() {
    const { history, createManualWorkout, workoutTemplates } = useStore();
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [manualWorkout, setManualWorkout] = useState({
        date: new Date().toISOString().slice(0, 16),
        duration: '',
        exercises: []
    });

    if (!history) return <div>Loading...</div>;

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString('de-DE', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const handleTemplateSelect = (templateId) => {
        const template = workoutTemplates.find(t => t.id === templateId);
        if (!template) return;

        setSelectedTemplate(template);

        const exercises = template.exercises.map(ex => ({
            exerciseId: ex.id,
            sets: [{ weight: '', reps: '' }]
        }));

        setManualWorkout({
            ...manualWorkout,
            exercises
        });
    };

    const addSet = (exerciseIndex) => {
        const newExercises = [...manualWorkout.exercises];
        newExercises[exerciseIndex].sets.push({ weight: '', reps: '' });
        setManualWorkout({ ...manualWorkout, exercises: newExercises });
    };

    const updateSet = (exerciseIndex, setIndex, field, value) => {
        const newExercises = [...manualWorkout.exercises];
        newExercises[exerciseIndex].sets[setIndex][field] = value;
        setManualWorkout({ ...manualWorkout, exercises: newExercises });
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();

        if (!selectedTemplate || !manualWorkout.duration) {
            alert("Please select a workout and enter duration");
            return;
        }

        let totalVolume = 0;
        const logs = manualWorkout.exercises.map(ex => {
            const completedSets = ex.sets
                .filter(s => s.weight && s.reps)
                .map(s => {
                    const weight = parseFloat(s.weight);
                    const reps = parseInt(s.reps);
                    totalVolume += weight * reps;
                    return {
                        weight,
                        reps,
                        completed: true,
                        timestamp: new Date().toISOString()
                    };
                });

            return {
                exerciseId: ex.exerciseId,
                sets: completedSets
            };
        }).filter(log => log.sets.length > 0);

        const success = await createManualWorkout({
            name: selectedTemplate.name,
            date: new Date(manualWorkout.date).toISOString(),
            duration: parseInt(manualWorkout.duration) * 60,
            volume: totalVolume,
            logs
        });

        if (success) {
            setShowManualEntry(false);
            setSelectedTemplate(null);
            setManualWorkout({
                date: new Date().toISOString().slice(0, 16),
                duration: '',
                exercises: []
            });
        } else {
            alert("Failed to log workout");
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href="/workout" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</Link>
                    <h1 style={{ fontSize: '1.5rem' }}>History</h1>
                </div>
                <button
                    onClick={() => setShowManualEntry(true)}
                    style={{
                        background: 'var(--surface-highlight)',
                        padding: '8px 16px',
                        borderRadius: '100px',
                        color: 'var(--primary)',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        border: '1px solid var(--border)',
                        cursor: 'pointer'
                    }}
                >
                    + Log
                </button>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {history.map((session) => (
                    <Link
                        href={`/workout/history/${session.id}`}
                        key={session.id}
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '16px',
                            display: 'block',
                            textDecoration: 'none',
                            color: 'inherit'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{session.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatDate(session.endTime || session.startTime)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            <span>⏱ {formatDuration(session.duration || 0)}</span>
                            <span>🏋️ {Math.round(session.volume || 0)} kg</span>
                        </div>
                    </Link>
                ))}

                {history.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                        No workouts completed yet.
                    </div>
                )}
            </div>

            {showManualEntry && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
                    overflowY: 'auto'
                }} onClick={() => setShowManualEntry(false)}>
                    <div style={{
                        background: 'var(--surface)',
                        padding: '24px',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>Log Workout</h2>

                        <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                                    Select Workout *
                                </label>
                                <select
                                    value={selectedTemplate?.id || ''}
                                    onChange={(e) => handleTemplateSelect(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'var(--background)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        color: 'var(--text-main)',
                                        fontSize: '1rem'
                                    }}
                                >
                                    <option value="">Choose a workout...</option>
                                    {workoutTemplates.map(template => (
                                        <option key={template.id} value={template.id}>{template.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedTemplate && (
                                <>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                                            Date & Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={manualWorkout.date}
                                            onChange={(e) => setManualWorkout({ ...manualWorkout, date: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: 'var(--background)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                color: 'var(--text-main)',
                                                fontSize: '1rem'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                                            Duration (minutes) *
                                        </label>
                                        <input
                                            type="number"
                                            value={manualWorkout.duration}
                                            onChange={(e) => setManualWorkout({ ...manualWorkout, duration: e.target.value })}
                                            placeholder="60"
                                            min="1"
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: 'var(--background)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                color: 'var(--text-main)',
                                                fontSize: '1rem'
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginTop: '16px' }}>
                                        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Exercises</h3>
                                        {manualWorkout.exercises.map((exercise, exIndex) => {
                                            const exerciseData = EXERCISES.find(e => e.id === exercise.exerciseId);
                                            return (
                                                <div key={exIndex} style={{ marginBottom: '20px', padding: '12px', background: 'var(--background)', borderRadius: '8px' }}>
                                                    <div style={{ fontWeight: '600', marginBottom: '12px' }}>{exerciseData?.name}</div>
                                                    {exercise.sets.map((set, setIndex) => (
                                                        <div key={setIndex} style={{ marginBottom: '12px', padding: '10px', background: 'var(--surface)', borderRadius: '6px' }}>
                                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>Set {setIndex + 1}</div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Weight (kg)"
                                                                    value={set.weight}
                                                                    onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '10px',
                                                                        background: 'var(--background)',
                                                                        border: '1px solid var(--border)',
                                                                        borderRadius: '6px',
                                                                        color: 'var(--text-main)',
                                                                        fontSize: '1rem'
                                                                    }}
                                                                />
                                                                <input
                                                                    type="number"
                                                                    placeholder="Reps"
                                                                    value={set.reps}
                                                                    onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '10px',
                                                                        background: 'var(--background)',
                                                                        border: '1px solid var(--border)',
                                                                        borderRadius: '6px',
                                                                        color: 'var(--text-main)',
                                                                        fontSize: '1rem'
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => addSet(exIndex)}
                                                        style={{
                                                            width: '100%',
                                                            marginTop: '4px',
                                                            padding: '10px',
                                                            background: 'transparent',
                                                            border: '1px dashed var(--border)',
                                                            borderRadius: '6px',
                                                            color: 'var(--text-muted)',
                                                            fontSize: '0.9rem',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        + Add Set
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowManualEntry(false);
                                        setSelectedTemplate(null);
                                        setManualWorkout({
                                            date: new Date().toISOString().slice(0, 16),
                                            duration: '',
                                            exercises: []
                                        });
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-main)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '1rem'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedTemplate}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: selectedTemplate ? 'var(--primary)' : 'var(--surface)',
                                        border: 'none',
                                        color: selectedTemplate ? '#000' : 'var(--text-muted)',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: selectedTemplate ? 'pointer' : 'not-allowed',
                                        fontSize: '1rem'
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
