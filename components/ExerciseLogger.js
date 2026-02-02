"use client";

import { useState, useEffect } from 'react';

export default function ExerciseLogger({ exerciseId, setId, previousData, onLog, initialData, type = 'Strength', suggestion = null }) {
    // Initialize state from existing data
    const [weight, setWeight] = useState((initialData?.weight !== undefined && initialData.weight !== null) ? initialData.weight : '');
    const [reps, setReps] = useState((initialData?.reps !== undefined && initialData.reps !== null) ? initialData.reps : '');
    // For Cardio: Weight = Distance (m/km) or Ignored, Reps = Time (seconds/minutes)
    // Let's standardize: Reps field stores DURATION (seconds) for Cardio/Stretch. Weight stores Distance (optional) or is hidden.

    // We need a formatted time state for UI (MM:SS) if it's Duration based
    const [durationStr, setDurationStr] = useState('');

    const [rpe, setRpe] = useState(initialData?.rpe || '');

    const [isLogged, setIsLogged] = useState(initialData?.completed || false);
    const [isPR, setIsPR] = useState(false);

    const isCardio = type === 'Cardio' || type === 'Stretch';
    const isStretch = type === 'Stretch';

    // Apply Suggestion
    const applySuggestion = () => {
        if (!suggestion) return;
        setWeight(suggestion.weight);
        setReps(suggestion.reps);
        // We don't auto-save (onLog) yet, let user confirm or adjust.
        // Or should we? "Click: Füllt die Felder automatisch aus." -> Usually implies fill inputs.
    };

    // Update local state if initialData changes

    // Update local state if initialData changes
    useEffect(() => {
        if (initialData) {
            setWeight((initialData.weight !== undefined && initialData.weight !== null) ? initialData.weight : '');
            setReps((initialData.reps !== undefined && initialData.reps !== null) ? initialData.reps : '');

            // If Cardio, convert reps (seconds) to MM:SS for display
            if (isCardio && initialData.reps) {
                const mins = Math.floor(initialData.reps / 60);
                const secs = initialData.reps % 60;
                setDurationStr(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
            }

            if (initialData.rpe !== undefined) setRpe(initialData.rpe);
            setIsLogged(!!initialData.completed);
        }
    }, [initialData, isCardio]);

    // Handle Duration Input Change (MM:SS or just Minutes?)
    // Let's allow free text like "10" (min) or "10:30"
    const handleDurationChange = (val) => {
        setDurationStr(val);
        // Parse to seconds for internal storage (reps)
        if (val.includes(':')) {
            const [m, s] = val.split(':').map(Number);
            if (!isNaN(m)) setReps((m * 60) + (s || 0));
        } else {
            const m = parseFloat(val);
            if (!isNaN(m)) setReps(m * 60); // Assume minutes if just number
        }
    };

    const handleLog = () => {
        if (isLogged) {
            // UNCHECK / EDIT
            setIsLogged(false);
            onLog({ weight, reps, rpe, completed: false });
            return;
        }

        if ((!weight || !reps) && !isCardio) {
            return;
        }

        if (isCardio && !reps && !weight) {
            // Allow at least one
            // Actually for stretch, maybe just checking it off is enough? 
            // If Stretch and no time, maybe just logging defaults?
        }

        const w = parseFloat(weight) || 0;
        const r = parseFloat(reps) || 0; // Duration in seconds if Cardio

        // Check PR logic (Simple Volume)
        if (!isCardio) {
            const currentVolume = w * r;
            const previousVolume = previousData ? previousData.lastWeight * previousData.lastReps : 0;
            if (previousVolume > 0 && currentVolume > previousVolume) setIsPR(true);
            else setIsPR(false);
        }

        onLog({ weight: w, reps: r, rpe, completed: true });
        setIsLogged(true);
    };

    const handleBlur = () => {
        // Auto-save on blur
        if (weight || reps || rpe) {
            const w = parseFloat(weight) || 0;
            const r = parseFloat(reps) || 0;
            onLog({ weight: w, reps: r, rpe, completed: isLogged });
        }
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: isCardio
                ? 'minmax(80px, 1fr) minmax(80px, 1fr) minmax(40px, 1fr) 40px'
                : 'minmax(50px, 1fr) minmax(50px, 1fr) minmax(40px, 1fr) 40px',
            gap: '8px',
            alignItems: 'center',
            marginBottom: '8px',
            opacity: isLogged ? 0.6 : 1,
            transition: 'opacity 0.3s'
        }}>
            {/* Smart Chip (Absolute or relative above?) - Let's use Grid spanning */}
            {suggestion && !isLogged && !weight && !reps && (
                <div style={{
                    gridColumn: '1 / -1',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={applySuggestion}
                        style={{
                            background: 'var(--accent)',
                            color: '#000',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '100px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                    >
                        <span>⚡ Vorschlag: {suggestion.weight}kg × {suggestion.reps}</span>
                        {suggestion.reason && <span style={{ fontWeight: 'normal', opacity: 0.8 }}>({suggestion.reason})</span>}
                    </button>
                </div>
            )}

            {/* Input 1: Weight (Strength) OR Distance/Intensity (Cardio) */}
            <div style={{ position: 'relative' }}>
                <input
                    type={isCardio ? "text" : "number"}
                    placeholder={isCardio ? (isStretch ? 'Reps/Time' : 'Dist (km)') : (previousData ? previousData.lastWeight : '-')}
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
                {!isCardio && <span style={{ position: 'absolute', right: '4px', top: '12px', fontSize: '0.6rem', color: 'var(--text-dim)' }}>kg</span>}
            </div>

            {/* Input 2: Reps (Strength) OR Duration (Cardio) */}
            <div style={{ position: 'relative' }}>
                <input
                    type={isCardio ? "text" : "number"}
                    placeholder={isCardio ? 'Time (min)' : (previousData ? previousData.lastReps : '-')}
                    value={isLogged ? ((isCardio && durationStr) ? durationStr : ((initialData?.reps && initialData.reps !== 0) ? initialData.reps : '')) : (isCardio ? durationStr : reps)}
                    onChange={(e) => isCardio ? handleDurationChange(e.target.value) : setReps(e.target.value)}
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
                placeholder={isCardio ? "Intens." : "RPE"}
                min="1"
                max="10"
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
