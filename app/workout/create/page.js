"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';

export default function CreateRoutinePage() {
    const router = useRouter();
    const { exercises, addWorkoutTemplate, addCustomExercise, deleteCustomExercise } = useStore();
    const [routineName, setRoutineName] = useState('');
    // selectedExercises: Array of { ...exercise, sets: [{}, {}, ... ] }
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [isSelecting, setIsSelecting] = useState(false);

    // Filter State
    const [selectedMuscle, setSelectedMuscle] = useState('All');
    const MUSCLES = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'];

    // Custom Exercise State
    const [customExerciseName, setCustomExerciseName] = useState('');
    const [customMuscle, setCustomMuscle] = useState('Other');

    // Filtered Exercises
    const filteredExercises = selectedMuscle === 'All'
        ? exercises
        : exercises.filter(ex => ex.muscle === selectedMuscle);

    const handleAddCustom = async () => {
        if (!customExerciseName.trim()) return;
        const newEx = await addCustomExercise(customExerciseName, customMuscle);

        // Auto-select with 3 default sets
        const exerciseWithDefaults = {
            ...newEx,
            sets: [{}, {}, {}] // Empty objects, just counting sets
        };
        setSelectedExercises(prev => [...prev, exerciseWithDefaults]);

        setCustomExerciseName('');
        setCustomMuscle('Other');
    };

    const handleCreate = () => {
        if (!routineName.trim() || selectedExercises.length === 0) return;

        const newTemplate = {
            name: routineName,
            exercises: selectedExercises.map(ex => ({
                id: ex.id,
                name: ex.name,
                sets: ex.sets // Save the explicit list of sets
            }))
        };

        addWorkoutTemplate(newTemplate);
        router.push('/workout');
    };

    const toggleExercise = (ex) => {
        if (selectedExercises.find(e => e.id === ex.id)) {
            setSelectedExercises(prev => prev.filter(e => e.id !== ex.id));
        } else {
            // Add with 3 default sets
            setSelectedExercises(prev => [...prev, {
                ...ex,
                sets: [{}, {}, {}]
            }]);
        }
    };

    const addSet = (exId) => {
        setSelectedExercises(prev => prev.map(ex => {
            if (ex.id !== exId) return ex;
            return {
                ...ex,
                sets: [...ex.sets, {}]
            };
        }));
    };

    const removeLastSet = (exId) => {
        setSelectedExercises(prev => prev.map(ex => {
            if (ex.id !== exId) return ex;
            if (ex.sets.length <= 1) return ex; // Keep at least one set
            return {
                ...ex,
                sets: ex.sets.slice(0, -1)
            };
        }));
    };

    if (isSelecting) {
        return (
            <div className="container" style={{ paddingBottom: '100px' }}>
                <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => setIsSelecting(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</button>
                    <h1 style={{ fontSize: '1.5rem' }}>Select Exercises</h1>
                </header>

                {/* Muscle Filter */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px', scrollbarWidth: 'none' }}>
                    {MUSCLES.map(muscle => (
                        <button
                            key={muscle}
                            onClick={() => setSelectedMuscle(muscle)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '100px',
                                border: selectedMuscle === muscle ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: selectedMuscle === muscle ? 'var(--primary-dim)' : 'var(--surface)',
                                color: selectedMuscle === muscle ? 'var(--primary)' : 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                                fontSize: '0.9rem'
                            }}
                        >
                            {muscle}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'grid', gap: '12px', paddingBottom: '100px' }}>
                    {/* Custom Exercise Input */}
                    <div style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '16px'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    value={customExerciseName}
                                    onChange={(e) => setCustomExerciseName(e.target.value)}
                                    placeholder="Add custom exercise..."
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: '1px solid var(--border)',
                                        color: 'var(--foreground)',
                                        padding: '8px'
                                    }}
                                />
                                <select
                                    value={customMuscle}
                                    onChange={(e) => setCustomMuscle(e.target.value)}
                                    style={{
                                        background: 'var(--surface-highlight)',
                                        border: 'none',
                                        color: 'var(--foreground)',
                                        padding: '8px',
                                        borderRadius: '4px'
                                    }}
                                >
                                    {MUSCLES.filter(m => m !== 'All').map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={handleAddCustom}
                                disabled={!customExerciseName.trim()}
                                style={{
                                    alignSelf: 'flex-end',
                                    background: 'var(--primary-dim)',
                                    color: 'var(--primary)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '8px 16px',
                                    fontWeight: '600',
                                    fontSize: '0.9rem'
                                }}
                            >
                                + Add & Select
                            </button>
                        </div>
                    </div>

                    {filteredExercises.map(ex => {
                        const isSelected = selectedExercises.find(e => e.id === ex.id);
                        return (
                            <div
                                key={ex.id}
                                style={{
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center'
                                }}
                            >
                                <button
                                    onClick={() => toggleExercise(ex)}
                                    style={{
                                        flex: 1,
                                        background: isSelected ? 'var(--surface-highlight)' : 'var(--surface)',
                                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                        padding: '16px',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'left',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{ex.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ex.muscle}</div>
                                    </div>
                                    {isSelected && <span style={{ color: 'var(--primary)' }}>✓</span>}
                                </button>

                                {(ex.isCustom || ex.user_id) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Delete custom exercise permanently?')) {
                                                deleteCustomExercise(ex.id);
                                            }
                                        }}
                                        style={{
                                            padding: '16px',
                                            background: 'var(--surface)',
                                            border: '1px solid var(--error-dim)',
                                            color: 'var(--error)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={() => setIsSelecting(false)}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '24px',
                        right: '24px',
                        padding: '16px',
                        background: 'var(--primary)',
                        color: '#000',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: '700',
                        border: 'none',
                        fontSize: '1.1rem'
                    }}
                >
                    Done ({selectedExercises.length})
                </button>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/workout" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>New Routine</h1>
            </header>

            <section>
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Routine Name</label>
                    <input
                        type="text"
                        value={routineName}
                        onChange={(e) => setRoutineName(e.target.value)}
                        placeholder="e.g. Chest & Triceps"
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--foreground)',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Exercises</label>

                    {selectedExercises.length > 0 && (
                        <div style={{ display: 'grid', gap: '16px', marginBottom: '16px' }}>
                            {selectedExercises.map((ex, i) => (
                                <div key={i} style={{
                                    padding: '16px',
                                    background: 'var(--surface)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{ex.name}</span>
                                        <button
                                            onClick={() => toggleExercise(ex)}
                                            style={{ color: 'var(--warning)', background: 'none', border: 'none', fontSize: '0.9rem' }}
                                        >
                                            Remove Exercise
                                        </button>
                                    </div>

                                    {/* Sets List (Count Only) */}
                                    <div style={{ marginBottom: '16px' }}>
                                        {ex.sets.map((set, setIdx) => (
                                            <div key={setIdx} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 0',
                                                borderBottom: setIdx < ex.sets.length - 1 ? '1px solid var(--border)' : 'none'
                                            }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Set {setIdx + 1}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add/Remove Buttons */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => addSet(ex.id)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                background: 'var(--primary-dim)',
                                                color: 'var(--primary)',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontWeight: '600'
                                            }}
                                        >
                                            + Add Set
                                        </button>
                                        <button
                                            onClick={() => removeLastSet(ex.id)}
                                            disabled={ex.sets.length <= 1}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                background: 'var(--surface-highlight)',
                                                color: ex.sets.length <= 1 ? 'var(--text-muted)' : 'var(--warning)',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontWeight: '600',
                                                opacity: ex.sets.length <= 1 ? 0.5 : 1
                                            }}
                                        >
                                            - Remove Set
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => setIsSelecting(true)}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'transparent',
                            border: '1px dashed var(--primary-dim)',
                            color: 'var(--primary)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '16px'
                        }}
                    >
                        {selectedExercises.length > 0 ? '+ Add More Exercises' : '+ Add Exercises'}
                    </button>
                </div>

                <button
                    onClick={handleCreate}
                    disabled={!routineName.trim() || selectedExercises.length === 0}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: (routineName.trim() && selectedExercises.length > 0) ? 'var(--primary)' : 'var(--surface-highlight)',
                        color: (routineName.trim() && selectedExercises.length > 0) ? '#000' : 'var(--text-muted)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: '700',
                        fontSize: '1.1rem',
                        transition: 'all 0.2s'
                    }}
                >
                    Create Routine
                </button>
            </section>
        </div>
    );
}
