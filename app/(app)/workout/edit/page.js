"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useTranslation } from '@/context/TranslationContext';

function EditRoutineContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const { t } = useTranslation();

    const {
        workoutTemplates,
        exercises,
        updateWorkoutTemplate,
        deleteWorkoutTemplate,
        addCustomExercise
    } = useStore();

    const [isLoading, setIsLoading] = useState(true);
    const [routineName, setRoutineName] = useState('');
    const [visibility, setVisibility] = useState('private');
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Custom Exercise State
    const [customExerciseName, setCustomExerciseName] = useState('');
    const [customMuscle, setCustomMuscle] = useState('Other');
    const MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'];

    useEffect(() => {
        if (!workoutTemplates || workoutTemplates.length === 0) return;
        if (!id) return;

        const template = workoutTemplates.find(t => t.id === id);
        if (template) {
            setRoutineName(template.name);
            setVisibility(template.visibility || 'private');
            // Hydrate exercises with defaults if missing sets array
            const hydratedExercises = template.exercises.map(ex => {
                // Find full exercise details to get the name
                const fullEx = exercises.find(e => e.id === ex.id) || {};
                const name = ex.name || fullEx.name || 'Unknown Exercise';

                if (ex.sets && Array.isArray(ex.sets)) return { ...ex, name }; // Already has new format

                // Fallback for old format
                const sets = [];
                // Check if 'sets' is a number (legacy) or use 'targetSets'
                const targetSets = (typeof ex.sets === 'number' ? ex.sets : ex.targetSets) || 3;
                const targetReps = ex.targetReps || 10;

                for (let i = 0; i < targetSets; i++) sets.push({ reps: parseInt(targetReps) || 10 });

                return { ...ex, sets, name };
            });
            setSelectedExercises(hydratedExercises);
        }
        setIsLoading(false);
    }, [id, workoutTemplates, exercises]);

    const handleAddCustom = () => {
        if (!customExerciseName.trim()) return;
        const newEx = addCustomExercise(customExerciseName, customMuscle);

        const exerciseWithDefaults = {
            ...newEx,
            sets: [
                { reps: 10 },
                { reps: 10 },
                { reps: 10 }
            ]
        };
        setSelectedExercises(prev => [...prev, exerciseWithDefaults]);

        setCustomExerciseName('');
        setCustomMuscle('Other');
    };

    const handleSave = () => {
        if (!routineName.trim() || selectedExercises.length === 0) return;

        updateWorkoutTemplate(id, {
            name: routineName,
            visibility: visibility,
            exercises: selectedExercises.map(ex => ({
                id: ex.id,
                name: ex.name,
                sets: ex.sets // Save sets array directly
            }))
        });

        router.push('/workout');
    };

    const handleDelete = () => {
        if (confirm(t('Are you sure you want to delete this routine?'))) {
            deleteWorkoutTemplate(id);
            router.push('/workout');
        }
    };

    const toggleExercise = (ex) => {
        if (selectedExercises.find(e => e.id === ex.id)) {
            setSelectedExercises(prev => prev.filter(e => e.id !== ex.id));
        } else {
            setSelectedExercises(prev => [...prev, {
                ...ex,
                sets: [
                    { reps: 10 },
                    { reps: 10 },
                    { reps: 10 }
                ]
            }]);
        }
    };

    const moveExercise = (index, direction) => {
        setSelectedExercises(prev => {
            const newArray = [...prev];
            if (direction === 'up' && index > 0) {
                [newArray[index - 1], newArray[index]] = [newArray[index], newArray[index - 1]];
            } else if (direction === 'down' && index < newArray.length - 1) {
                [newArray[index + 1], newArray[index]] = [newArray[index], newArray[index + 1]];
            }
            return newArray;
        });
    };

    const addSet = (exId) => {
        setSelectedExercises(prev => prev.map(ex => {
            if (ex.id !== exId) return ex;
            const lastSet = ex.sets[ex.sets.length - 1];
            return {
                ...ex,
                sets: [...ex.sets, { reps: lastSet ? lastSet.reps : 10 }]
            };
        }));
    };

    const removeLastSet = (exId) => {
        setSelectedExercises(prev => prev.map(ex => {
            if (ex.id !== exId) return ex;
            if (ex.sets.length <= 1) return ex;
            return {
                ...ex,
                sets: ex.sets.slice(0, -1)
            };
        }));
    };

    const updateSetReps = (exId, setIndex, value) => {
        setSelectedExercises(prev => prev.map(ex => {
            if (ex.id !== exId) return ex;
            const newSets = [...ex.sets];
            newSets[setIndex] = { ...newSets[setIndex], reps: parseInt(value) || 0 };
            return { ...ex, sets: newSets };
        }));
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [filterMuscle, setFilterMuscle] = useState('All');

    // ... (inside isSelecting view)

    // Filtered Exercises
    const filteredExercises = exercises.filter(ex => {
        const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMuscle = filterMuscle === 'All' || ex.muscle === filterMuscle;
        return matchesSearch && matchesMuscle;
    });

    if (isSelecting) {
        return (
            <div className="container" style={{ paddingBottom: '100px' }}>
                <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => setIsSelecting(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</button>
                    <h1 style={{ fontSize: '1.5rem' }}>{t('Select Exercises')}</h1>
                </header>

                {/* Search & Filter */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <input
                        type="text"
                        placeholder={t('Search...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--foreground)'
                        }}
                    />
                    <select
                        value={filterMuscle}
                        onChange={(e) => setFilterMuscle(e.target.value)}
                        style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text-main)'
                        }}
                    >
                        <option value="All">{t('All Muscles')}</option>
                        {MUSCLES.map(m => <option key={m} value={m}>{t(m)}</option>)}
                    </select>
                </div>

                <div style={{ display: 'grid', gap: '12px', paddingBottom: '100px' }}>
                    {/* Reuse Custom Exercise Input */}
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
                                    placeholder={t('Add custom exercise...')}
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
                                    {MUSCLES.map(m => <option key={m} value={m}>{t(m)}</option>)}
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
                                + {t('Add & Select')}
                            </button>
                        </div>
                    </div>

                    {filteredExercises.map(ex => {
                        const isSelected = selectedExercises.find(e => e.id === ex.id);
                        return (
                            <button
                                key={ex.id}
                                onClick={() => toggleExercise(ex)}
                                style={{
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
                    {t('Done')} ({selectedExercises.length})
                </button>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/workout" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</Link>
                <div style={{ flex: 1 }}></div>
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{ color: 'var(--warning)', background: 'none', border: 'none' }}
                >
                    {t('Delete')}
                </button>
            </header>

            <h1 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>{t('Edit Routine')}</h1>

            <section>
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>{t('Routine Name')}</label>
                    <input
                        type="text"
                        value={routineName}
                        onChange={(e) => setRoutineName(e.target.value)}
                        placeholder={t('e.g. Chest & Triceps')}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--foreground)',
                            fontSize: '1rem',
                            marginBottom: '12px'
                        }}
                    />

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <label style={{ color: 'var(--text-muted)' }}>{t('Visibility')}:</label>
                        <select
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-main)',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="public">{t('Public (Friends can copy)')}</option>
                            <option value="private">{t('Private (Only me)')}</option>
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>{t('Exercises')}</label>

                    {selectedExercises.length > 0 && (
                        <div style={{ display: 'grid', gap: '16px', marginBottom: '16px' }}>
                            {selectedExercises.map((ex, i) => (
                                <div key={i} style={{
                                    padding: '16px',
                                    background: 'var(--surface)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <button onClick={() => moveExercise(i, 'up')} disabled={i === 0} style={{ background: 'var(--surface-highlight)', border: 'none', borderRadius: '4px', padding: '4px', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
                                                <button onClick={() => moveExercise(i, 'down')} disabled={i === selectedExercises.length - 1} style={{ background: 'var(--surface-highlight)', border: 'none', borderRadius: '4px', padding: '4px', cursor: i === selectedExercises.length - 1 ? 'default' : 'pointer', opacity: i === selectedExercises.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
                                            </div>
                                            <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{ex.name}</span>
                                        </div>
                                        <button
                                            onClick={() => toggleExercise(ex)}
                                            style={{ color: 'var(--warning)', background: 'none', border: 'none', fontSize: '0.9rem' }}
                                        >
                                            {t('Remove Exercise')}
                                        </button>
                                    </div>

                                    {/* Sets List */}
                                    <div style={{ marginBottom: '16px' }}>
                                        {ex.sets.map((set, setIdx) => (
                                            <div key={setIdx} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 0',
                                                borderBottom: setIdx < ex.sets.length - 1 ? '1px solid var(--border)' : 'none'
                                            }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('Set')} {setIdx + 1}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input
                                                        type="number"
                                                        value={set.reps === undefined ? '' : set.reps}
                                                        onChange={(e) => updateSetReps(ex.id, setIdx, e.target.value)}
                                                        style={{
                                                            width: '60px',
                                                            padding: '8px',
                                                            borderRadius: '4px',
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--background)',
                                                            color: 'var(--foreground)',
                                                            textAlign: 'center'
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Reps')}</span>
                                                </div>
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
                                            + {t('Add Set')}
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
                                            - {t('Remove Set')}
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
                        {selectedExercises.length > 0 ? `+ ${t('Add More Exercises')}` : `+ ${t('Add Exercises')}`}
                    </button>

                    <div style={{ display: 'grid', gap: '16px' }}>
                        <button
                            onClick={handleSave}
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
                            {t('Save Changes')}
                        </button>
                    </div>
                </div>
            </section>

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteConfirm && (
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
                        <h3 style={{ marginBottom: '16px' }}>{t('Delete Routine?')}</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                            {t('Are you sure you want to delete this routine permanently?')}
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                {t('Cancel')}
                            </button>
                            <button
                                onClick={() => {
                                    deleteWorkoutTemplate(id);
                                    router.push('/workout');
                                }}
                                style={{ flex: 1, padding: '12px', background: 'var(--error)', border: 'none', color: '#FFF', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                {t('Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}

export default function EditRoutinePage() {
    return (
        <ErrorBoundary message="Routine unavailable">
            <Suspense fallback={<div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Loading Routine...</div>}>
                <EditRoutineContent />
            </Suspense>
        </ErrorBoundary>
    );
}
