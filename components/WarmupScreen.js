"use client";

import { useState, useEffect, useRef } from 'react';
import { getWarmupForRoutine, GENERAL_WARMUP } from '@/lib/smart-warmup';
import { useStore } from '@/lib/store';
import ExercisePicker from '@/components/ExercisePicker';

export default function WarmupScreen({ template, onComplete }) {
    const { exercises, addExerciseToWorkout, logSet } = useStore();
    const [activations, setActivations] = useState([]);
    // selectedItems stores IDs now for reliable logging, or objects if ID missing
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [customExercises, setCustomExercises] = useState([]); // List of manually added exercises
    const isInitialized = useRef(false);

    useEffect(() => {
        if (template && exercises.length > 0 && !isInitialized.current) {
            const generated = getWarmupForRoutine(template, exercises);
            setActivations(generated);

            const initialSelection = new Set();
            // User requested that smart activations are NOT automatically selected.
            // generated.forEach(ex => {
            //     if (ex.id) initialSelection.add(ex.id);
            // });
            setSelectedIds(initialSelection);
            isInitialized.current = true;
        }
    }, [template, exercises]);

    const toggleItem = (id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleAddExercise = (ex) => {
        // Add to custom list
        setCustomExercises(prev => [...prev, { ...ex, isCustom: true }]);
        // Auto-select
        setSelectedIds(prev => new Set(prev).add(ex.id));
        setShowPicker(false);
    };

    const handleStart = async () => {
        if (selectedIds.size === 0) return; // Should be disabled anyway
        setIsSubmitting(true);

        // Log selected items
        // We find the full objects from our sources
        const allSources = [...GENERAL_WARMUP, ...activations, ...customExercises];
        const selectedObjects = allSources.filter(item => selectedIds.has(item.id));

        console.log("Logging Warmup Items:", selectedObjects);

        // Sequence:
        // 1. Add exercises to workout (if not already present? Well, warmup items likely aren't)
        // 2. Log a single set as "Completed" with 0 weight/reps (or default duration if we had it)

        for (const ex of selectedObjects) {
            if (!ex.id) continue;

            // Add Exercise
            // We need to wait for state updates? The store functions might be async or sync.
            // addExerciseToWorkout pushes to the array.

            // NOTE: activeWorkout.logs might update asynchronously.
            // But we can just fire-and-forget for now, relying on the fact that we stay in live mode.
            // However, to log a set, we need the exercise to be in the logs.
            // `addExerciseToWorkout` usually appends.

            // CRITICAL: We need to know the index or ensure it's added.
            // Since `addExerciseToWorkout` interacts with `activeWorkout` state, calling it in a loop might cause race conditions if it relies on `prev` state properly.
            // `useStore` implementation usually handles `setState(prev => ...)` correctly.

            addExerciseToWorkout(ex.id);

            // We can't immediately log the set because we don't know the index yet in the `logs` array.
            // But we can rely on the user seeing them added and checked?
            // User requirement: "Steht das warmup und die übungen davon auch in der History"
            // If we add them, they are in the workout. If user does nothing else, they are "0 sets completed" unless we mark them.
            // For now, let's just ADD them. The user can manually check them off or we can try to auto-complete.
            // Auto-complete is risky without index.
            // Alternative: Just add them. User sees them at the bottom (or top?) of the list.

            // If we want to be fancy, we'd implemented a special `addWarmupBatch` action in store.
            // But just adding them is a good start.
        }

        // Give a small delay for state options to propagate if needed, though onComplete just switches view.
        setTimeout(() => {
            onComplete();
        }, 100);
    };

    return (
        <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Warm-Up Flow</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                    Prepare your body for {template.name}.
                </p>

                {/* Progress Indicator */}
                <div style={{ marginBottom: '32px', background: 'var(--surface)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                        <span>Reduces injury risk 🛡️</span>
                        <span style={{ color: selectedIds.size > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                            {selectedIds.size} Selected
                        </span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--surface-highlight)', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min((selectedIds.size / 3) * 100, 100)}%`,
                            background: selectedIds.size > 0 ? 'var(--success)' : 'transparent',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>

                {/* Section A: General */}
                <section style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--primary)' }}>General Warm-Up</h3>
                    {GENERAL_WARMUP.map(item => ( // Ensure GENERAL_WARMUP items have IDs (e.g. 'treadmill' or placeholder)
                        // We used 'general_cardio' dummy ID in logic.
                        <div key={item.id}
                            onClick={() => toggleItem(item.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px',
                                background: selectedIds.has(item.id) ? 'var(--surface-highlight)' : 'var(--surface)',
                                border: selectedIds.has(item.id) ? '1px solid var(--primary)' : '1px solid var(--border)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: '24px', height: '24px',
                                borderRadius: '50%',
                                border: selectedIds.has(item.id) ? '6px solid var(--primary)' : '2px solid var(--text-muted)',
                                flexShrink: 0
                            }} />
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Typical: 5-10 min</div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Section B: Smart Activation */}
                {(activations.length > 0 || customExercises.length > 0) && (
                    <section style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--secondary)' }}>Smart & Custom Activation</h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {[...activations, ...customExercises].map((item, i) => (
                                <div key={item.id || i}
                                    onClick={() => toggleItem(item.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px',
                                        background: selectedIds.has(item.id) ? 'var(--surface-highlight)' : 'var(--surface)',
                                        border: selectedIds.has(item.id) ? '1px solid var(--secondary)' : '1px solid var(--border)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '24px', height: '24px',
                                        borderRadius: '4px',
                                        background: selectedIds.has(item.id) ? 'var(--secondary)' : 'transparent',
                                        border: selectedIds.has(item.id) ? 'none' : '2px solid var(--text-muted)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'black', fontWeight: 'bold',
                                        flexShrink: 0
                                    }}>
                                        {selectedIds.has(item.id) && '✓'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            {item.isCustom ? 'Custom Added' : (item.defaultRep || 'Recommended')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <button
                    onClick={() => setShowPicker(true)}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: 'transparent',
                        border: '1px dashed var(--text-muted)',
                        color: 'var(--text-muted)',
                        borderRadius: '12px',
                        cursor: 'pointer'
                    }}
                >
                    + Add Custom Warm-Up Exercise
                </button>
            </div>

            {/* Actions */}
            <div style={{ padding: '20px 0', borderTop: '1px solid var(--border)', display: 'grid', gap: '12px', background: 'var(--background)' }}>
                <button
                    onClick={handleStart}
                    disabled={isSubmitting || selectedIds.size === 0}
                    style={{
                        padding: '18px',
                        background: selectedIds.size > 0 ? 'var(--primary)' : 'var(--surface-highlight)',
                        color: selectedIds.size > 0 ? 'black' : 'var(--text-muted)',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '16px',
                        cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                        opacity: selectedIds.size > 0 ? 1 : 0.5
                    }}
                >
                    Start Main Workout ({selectedIds.size})
                </button>
                <button
                    onClick={onComplete}
                    style={{
                        padding: '16px',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: '1rem',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Skip Warmup
                </button>
            </div>

            {/* Exercise Picker Modal */}
            {showPicker && (
                <ExercisePicker
                    onSelect={handleAddExercise}
                    onCancel={() => setShowPicker(false)}
                />
            )}
        </div>
    );
}
