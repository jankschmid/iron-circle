"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';

export default function ExercisePicker({ onSelect, onCancel }) {
    const { exercises, addCustomExercise, deleteCustomExercise, updateCustomExercise } = useStore();

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState('All');
    const MUSCLES = ['All', 'Custom', 'Chest', 'Back', 'Legs', 'Calves', 'Shoulders', 'Biceps', 'Triceps', 'Traps', 'Neck', 'Core', 'Cardio', 'Full Body', 'Other'];
    const MUSCLE_OPTIONS = MUSCLES.filter(m => m !== 'All' && m !== 'Custom'); // for dropdowns

    // Custom Exercise Modal State
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [editingExercise, setEditingExercise] = useState(null);
    const [customFormName, setCustomFormName] = useState('');
    const [customFormMuscle, setCustomFormMuscle] = useState('Other');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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

    const openEditModal = (ex, e) => {
        e.stopPropagation(); // don't trigger onSelect
        setEditingExercise(ex);
        setCustomFormName(ex.name);
        setCustomFormMuscle(ex.muscle || 'Other');
        setShowCustomModal(true);
    };

    const handleDelete = async (exId, e) => {
        e.stopPropagation();
        if (confirmDeleteId === exId) {
            await deleteCustomExercise(exId);
            setConfirmDeleteId(null);
        } else {
            setConfirmDeleteId(exId);
            // Auto-cancel confirm state after 3s
            setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    };

    const openAddModal = () => {
        setEditingExercise(null);
        setCustomFormName('');
        setCustomFormMuscle('Other');
        setShowCustomModal(true);
    };

    const handleSaveCustom = async () => {
        if (!customFormName.trim()) return;

        if (editingExercise) {
            const success = await updateCustomExercise(editingExercise.id, customFormName, customFormMuscle);
            if (success) setShowCustomModal(false);
        } else {
            const newEx = await addCustomExercise(customFormName, customFormMuscle);
            if (newEx) {
                // Auto-select if desired, or just close modal
                // Usually user wants to verify, then click the new item.
                setShowCustomModal(false);
            }
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--background)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <header style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: 'var(--surface)'
            }}>
                <button
                    onClick={onCancel}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    ←
                </button>
                <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Add Exercise</h1>
            </header>

            <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
                {/* Search & Custom Button */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        autoFocus
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--foreground)',
                            fontSize: '1rem'
                        }}
                    />
                    <button
                        onClick={openAddModal}
                        style={{
                            padding: '0 16px',
                            background: 'var(--surface-highlight)',
                            color: 'var(--primary)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                        }}
                    >
                        + New
                    </button>
                </div>

                {/* Muscle Chips */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                    marginBottom: '16px',
                    scrollbarWidth: 'none'
                }}>
                    {MUSCLES.map(muscle => (
                        <button
                            key={muscle}
                            onClick={() => setSelectedMuscle(muscle)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '100px',
                                border: selectedMuscle === muscle ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: selectedMuscle === muscle ? 'var(--primary-dim)' : 'var(--surface)',
                                color: selectedMuscle === muscle ? 'var(--primary)' : 'var(--text-muted)',
                                flexShrink: 0,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            {muscle}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
                    {filteredExercises.map(ex => {
                        const isCustom = ex.isCustom || ex.user_id;
                        const isConfirmingDelete = confirmDeleteId === ex.id;
                        return (
                            <div
                                key={ex.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '14px 16px',
                                    background: 'var(--surface)',
                                    border: isConfirmingDelete ? '1px solid var(--error)' : '1px solid var(--border)',
                                    borderRadius: '8px',
                                    gap: '8px'
                                }}
                            >
                                {/* Tap anywhere on left area to select */}
                                <button
                                    onClick={() => onSelect(ex)}
                                    style={{ flex: 1, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                                >
                                    <div style={{ fontWeight: '600', color: 'var(--foreground)' }}>{ex.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {ex.muscle}{isCustom ? ' · Custom' : ''}
                                    </div>
                                </button>

                                {/* Edit / Delete — visible only for custom exercises */}
                                {isCustom && (
                                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                        <button
                                            onClick={(e) => openEditModal(ex, e)}
                                            title="Edit"
                                            style={{
                                                padding: '6px 10px',
                                                background: 'var(--surface-highlight)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(ex.id, e)}
                                            title={isConfirmingDelete ? 'Tap again to confirm' : 'Delete'}
                                            style={{
                                                padding: '6px 10px',
                                                background: isConfirmingDelete ? 'rgba(255,23,68,0.15)' : 'var(--surface-highlight)',
                                                border: isConfirmingDelete ? '1px solid var(--error)' : '1px solid var(--border)',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                color: isConfirmingDelete ? 'var(--error)' : 'inherit'
                                            }}
                                        >
                                            {isConfirmingDelete ? '⚠️' : '🗑️'}
                                        </button>
                                    </div>
                                )}

                                {/* Add button for non-custom, or show + always */}
                                {!isCustom && (
                                    <button
                                        onClick={() => onSelect(ex)}
                                        style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                        +
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {filteredExercises.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                            No exercises found. Try creating a custom one!
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Exercise Modal */}
            {showCustomModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 3000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setShowCustomModal(false)}>
                    <div style={{
                        background: 'var(--surface)',
                        padding: '24px',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '350px',
                        border: '1px solid var(--border)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>
                            {editingExercise ? 'Edit Exercise' : 'New Custom Exercise'}
                        </h3>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Name</label>
                            <input
                                value={customFormName}
                                onChange={(e) => setCustomFormName(e.target.value)}
                                placeholder="e.g. Muscle-Up"
                                style={{ width: '100%', padding: '10px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', color: '#fff' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Muscle Group</label>
                            <select
                                value={customFormMuscle}
                                onChange={(e) => setCustomFormMuscle(e.target.value)}
                                style={{ width: '100%', padding: '10px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', color: '#fff' }}
                            >
                                {MUSCLE_OPTIONS.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowCustomModal(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleSaveCustom} style={{ flex: 1, padding: '10px', background: 'var(--primary)', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
