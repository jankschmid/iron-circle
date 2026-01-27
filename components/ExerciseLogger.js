"use client";

import { useState, useEffect } from 'react';

export default function ExerciseLogger({ exerciseId, setId, previousData, onLog, initialData }) {
    // Initialize state from existing data if possible, converting 0 to '' for inputs
    const [weight, setWeight] = useState((initialData?.weight && initialData.weight !== 0) ? initialData.weight : '');
    const [reps, setReps] = useState((initialData?.reps && initialData.reps !== 0) ? initialData.reps : '');
    const [rpe, setRpe] = useState(initialData?.rpe || '');

    const [isLogged, setIsLogged] = useState(initialData?.completed || false);
    const [isPR, setIsPR] = useState(false);

    // Update local state if initialData changes (e.g. from parent re-render)
    useEffect(() => {
        if (initialData) {
            setWeight((initialData.weight !== undefined && initialData.weight !== 0) ? initialData.weight : '');
            setReps((initialData.reps !== undefined && initialData.reps !== 0) ? initialData.reps : '');
            if (initialData.rpe !== undefined) setRpe(initialData.rpe);
            setIsLogged(!!initialData.completed);
        }
    }, [initialData]);

    const handleLog = () => {
        if (isLogged) {
            // UNCHECK / EDIT
            setIsLogged(false);
            // We update the store to uncompleted, but keep values
            onLog({ weight, reps, rpe, completed: false });
            return;
        }

        if (!weight || !reps) {
            console.warn("ExerciseLogger: Missing weight or reps", { weight, reps });
            return;
        }

        // Convert to numbers
        const w = parseFloat(weight);
        const r = parseFloat(reps);

        // Check PR (Volume PR logic: Weight * Reps > Previous Max Volume)
        const currentVolume = w * r;
        const previousVolume = previousData ? previousData.lastWeight * previousData.lastReps : 0;

        if (previousVolume > 0 && currentVolume > previousVolume) {
            setIsPR(true);
        } else {
            setIsPR(false);
        }

        onLog({ weight: w, reps: r, rpe, completed: true });
        setIsLogged(true);
    };

    const handleBlur = () => {
        // Auto-save on blur (even if not completed)
        if (weight || reps || rpe) {
            const w = parseFloat(weight) || 0;
            const r = parseFloat(reps) || 0;
            onLog({ weight: w, reps: r, rpe, completed: isLogged });
        }
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(50px, 1fr) minmax(50px, 1fr) minmax(40px, 1fr) 40px',
            gap: '8px',
            alignItems: 'center',
            marginBottom: '8px',
            opacity: isLogged ? 0.6 : 1,
            transition: 'opacity 0.3s'
        }}>
            {/* Weight Input */}
            <div style={{ position: 'relative' }}>
                <input
                    type="number"
                    placeholder={previousData ? previousData.lastWeight : '-'}
                    value={isLogged ? ((initialData?.weight && initialData.weight !== 0) ? initialData.weight : '') : weight}
                    onChange={(e) => setWeight(e.target.value)}
                    onBlur={handleBlur}
                    disabled={isLogged}
                    style={{
                        background: 'var(--surface-highlight)',
                        color: 'var(--text-main)',
                        width: '100%',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        border: isPR ? '1px solid var(--accent)' : 'none'
                    }}
                />
                <span style={{ position: 'absolute', right: '4px', top: '12px', fontSize: '0.6rem', color: 'var(--text-dim)' }}>kg</span>
            </div>

            {/* Reps Input */}
            <div style={{ position: 'relative' }}>
                <input
                    type="number"
                    placeholder={previousData ? previousData.lastReps : '-'}
                    value={isLogged ? ((initialData?.reps && initialData.reps !== 0) ? initialData.reps : '') : reps}
                    onChange={(e) => setReps(e.target.value)}
                    onBlur={handleBlur}
                    disabled={isLogged}
                    style={{
                        background: 'var(--surface-highlight)',
                        color: 'var(--text-main)',
                        width: '100%',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center'
                    }}
                />
            </div>

            {/* RPE Input */}
            <input
                type="number"
                placeholder="RIR"
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
                onBlur={handleBlur}
                disabled={isLogged}
                style={{
                    background: 'var(--surface-highlight)',
                    color: 'var(--text-muted)',
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    fontSize: '0.9rem'
                }}
            />

            {/* Action Button */}
            <button
                onClick={handleLog}
                style={{
                    background: isLogged ? 'var(--success)' : 'var(--primary)',
                    color: isLogged ? '#FFF' : '#000',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                }}
            >
                {isLogged ? '✓' : '+'}
            </button>

            {isPR && isLogged && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    🏆 NEW PR!
                </div>
            )}
        </div>
    );
}
