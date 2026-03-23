"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/context/TranslationContext';

export default function CreateRoutinePage() {
    const router = useRouter();
    const { t } = useTranslation();
    const { exercises, addWorkoutTemplate, addCustomExercise, deleteCustomExercise, updateCustomExercise } = useStore();
    const [routineName, setRoutineName] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [isSelecting, setIsSelecting] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState('All');
    const MUSCLES = ['All', 'Custom', 'Chest', 'Back', 'Legs', 'Calves', 'Shoulders', 'Biceps', 'Triceps', 'Traps', 'Neck', 'Core', 'Cardio', 'Other'];

    // Custom Exercise Modal State
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [editingExercise, setEditingExercise] = useState(null); // If set, we are editing
    const [customFormName, setCustomFormName] = useState('');
    const [customFormMuscle, setCustomFormMuscle] = useState('Other');

    // Delete Confirmation State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [exerciseToDelete, setExerciseToDelete] = useState(null);

    // Filtered Exercises
    const filteredExercises = exercises.filter(ex => {
        const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesMuscle = true;
        if (selectedMuscle === 'Custom') {
            matchesMuscle = ex.isCustom || ex.user_id;
        } else if (selectedMuscle !== 'All') {
            matchesMuscle = ex.muscle === selectedMuscle;
        }

        return matchesMuscle && matchesSearch;
    });

    const openAddModal = () => {
        setEditingExercise(null);
        setCustomFormName('');
        setCustomFormMuscle('Other');
        setShowCustomModal(true);
    };

    const openEditModal = (ex) => {
        setEditingExercise(ex);
        setCustomFormName(ex.name);
        setCustomFormMuscle(ex.muscle);
        setShowCustomModal(true);
    };

    const confirmDelete = (ex) => {
        setExerciseToDelete(ex);
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        if (exerciseToDelete) {
            await deleteCustomExercise(exerciseToDelete.id);
            // If it was selected, remove it
            setSelectedExercises(prev => prev.filter(e => e.id !== exerciseToDelete.id));
            setShowDeleteConfirm(false);
            setExerciseToDelete(null);
        }
    };

    const handleSaveCustom = async () => {
        if (!customFormName.trim()) return;

        if (editingExercise) {
            // Update
            const success = await updateCustomExercise(editingExercise.id, customFormName, customFormMuscle);
            if (success) {
                // Update selection if it was selected
                setSelectedExercises(prev => prev.map(e => e.id === editingExercise.id ? { ...e, name: customFormName, muscle: customFormMuscle } : e));
                setShowCustomModal(false);
            }
        } else {
            // Create
            const newEx = await addCustomExercise(customFormName, customFormMuscle);
            if (newEx) {
                // Auto-select
                setSelectedExercises(prev => [...prev, newEx]);
                setShowCustomModal(false);
            }
        }
    };

    const handleCreate = () => {
        if (!routineName.trim() || selectedExercises.length === 0) return;

        const newTemplate = {
            name: routineName,
            visibility,
            exercises: selectedExercises.map(ex => ({
                id: ex.id,
                name: ex.name,
                // Sets default to 3 logic in store
            }))
        };

        addWorkoutTemplate(newTemplate);
        router.push('/workout');
    };

    const toggleExercise = (ex) => {
        if (selectedExercises.find(e => e.id === ex.id)) {
            setSelectedExercises(prev => prev.filter(e => e.id !== ex.id));
        } else {
            setSelectedExercises(prev => [...prev, ex]);
        }
    };

    if (isSelecting) {
        return (
            <div className="container" style={{ paddingBottom: '100px' }}>
                <header style={{ padding: '24px 0 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => setIsSelecting(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</button>
                    <h1 style={{ fontSize: '1.5rem' }}>{t('Select Exercises')}</h1>
                </header>

                {/* Search & Add Custom */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('Search exercises...')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--foreground)',
                            fontSize: '1rem'
                        }}
                    />
                    <button
                        onClick={openAddModal}
                        style={{
                            padding: '0 16px',
                            background: 'var(--primary-dim)',
                            color: 'var(--primary)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        + {t('Custom')}
                    </button>
                </div>

                {/* Muscle Filter - Improved Scroll */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '8px', // Slightly adjusted
                    marginBottom: '16px',
                    whiteSpace: 'nowrap',
                    scrollbarWidth: 'thin', // Show thin scrollbar
                    scrollbarColor: 'var(--border) transparent'
                }}>
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
                                display: 'inline-block', // Ensure inline block
                                fontSize: '0.9rem',
                                flexShrink: 0 // Prevent shrinking
                            }}
                        >
                            {t(muscle)}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'grid', gap: '12px', paddingBottom: '100px' }}>
                    {filteredExercises.map(ex => {
                        const isSelected = selectedExercises.find(e => e.id === ex.id);
                        const isCustom = ex.isCustom || ex.user_id;

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

                                {isCustom && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditModal(ex);
                                            }}
                                            style={{
                                                padding: '8px',
                                                background: 'var(--surface)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-main)',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                confirmDelete(ex);
                                            }}
                                            style={{
                                                padding: '8px',
                                                background: 'var(--surface)',
                                                border: '1px solid var(--error-dim)',
                                                color: 'var(--error)',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
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
                    {t('Done')} ({selectedExercises.length})
                </button>

                {/* Custom Exercise Modal */}
                {showCustomModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px'
                    }} onClick={() => setShowCustomModal(false)}>
                        <div style={{
                            background: 'var(--surface)',
                            padding: '24px',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '400px',
                            border: '1px solid var(--border)'
                        }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>
                                {editingExercise ? t('Edit Exercise') : t('New Custom Exercise')}
                            </h3>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>{t('Name')}</label>
                                <input
                                    value={customFormName}
                                    onChange={(e) => setCustomFormName(e.target.value)}
                                    placeholder={t('e.g. Weighted Dips')}
                                    autoFocus
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

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>{t('Muscle Group')}</label>
                                <select
                                    value={customFormMuscle}
                                    onChange={(e) => setCustomFormMuscle(e.target.value)}
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
                                    {MUSCLES.filter(m => m !== 'All').map(m => (
                                        <option key={m} value={m}>{t(m)}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowCustomModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-main)',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t('Cancel')}
                                </button>
                                <button
                                    onClick={handleSaveCustom}
                                    disabled={!customFormName.trim()}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'var(--primary)',
                                        border: 'none',
                                        color: '#000',
                                        fontWeight: 'bold',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        opacity: customFormName.trim() ? 1 : 0.5
                                    }}
                                >
                                    {t('Save')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', zIndex: 1001,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px'
                    }} onClick={() => setShowDeleteConfirm(false)}>
                        <div style={{
                            background: 'var(--surface)',
                            padding: '24px',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '350px',
                            border: '1px solid var(--border)',
                            textAlign: 'center'
                        }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>{t('Delete Exercise?')}</h3>
                            {t('Are you sure you want to permanently delete')} <strong>{exerciseToDelete?.name}</strong>? {t('This cannot be undone.')}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-main)',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t('Cancel')}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'var(--error)',
                                        border: 'none',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
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



    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/workout" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>{t('New Routine')}</h1>
            </header>

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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{ex.name}</span>
                                        <button
                                            onClick={() => toggleExercise(ex)}
                                            style={{ color: 'var(--warning)', background: 'none', border: 'none', fontSize: '0.9rem' }}
                                        >
                                            {t('Remove')}
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {t('Default')}: 3 {t('Sets')}
                                    </div>
                                    <div style={{ marginTop: '8px' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{t('Training Goal')}:</label>
                                        <select
                                            value={ex.target_rep_range || 'auto'}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSelectedExercises(prev => prev.map(p => p.id === ex.id ? { ...p, target_rep_range: val } : p));
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                background: 'var(--background)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-main)',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <option value="auto">{t('Auto-Detect (Smart)')}</option>
                                            <option value="1-5">{t('Strength (1-5 reps)')}</option>
                                            <option value="6-12">{t('Hypertrophy (6-12 reps)')}</option>
                                            <option value="12-20">{t('Endurance (12-20 reps)')}</option>
                                            <option value="custom">{t('Custom Range')}</option>
                                        </select>
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
                    {t('Create Routine')}
                </button>
            </section>
        </div>
    );
}
