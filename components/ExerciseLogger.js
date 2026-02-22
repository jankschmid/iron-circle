"use client";

import { useState, useEffect } from 'react';

export default function ExerciseLogger({ exerciseId, setId, previousData, onLog, initialData, type = 'Strength', suggestion = null }) {
    // Initialize state from existing data. If 0, fallback to previousData or keep empty.
    const getInitialWeight = () => {
        if (initialData?.weight && initialData.weight !== 0) return initialData.weight;
        // If no smart push, default to last weight
        if (previousData?.lastWeight && (!suggestion || !suggestion.isPush)) return previousData.lastWeight;
        return '';
    };

    const getInitialReps = () => {
        if (initialData?.reps && initialData.reps !== 0) return initialData.reps;
        // If no smart push, default to last reps
        if (previousData?.lastReps && (!suggestion || !suggestion.isPush)) return previousData.lastReps;
        return '';
    };

    const [weight, setWeight] = useState(getInitialWeight());
    const [reps, setReps] = useState(getInitialReps());
    // For Cardio: Weight = Distance (m/km) or Ignored, Reps = Time (seconds/minutes)
    // Let's standardize: Reps field stores DURATION (seconds) for Cardio/Stretch. Weight stores Distance (optional) or is hidden.

    // We need a formatted time state for UI (MM:SS) if it's Duration based
    const [durationStr, setDurationStr] = useState('');

    const [rpe, setRpe] = useState(initialData?.rpe || '');

    const [isLogged, setIsLogged] = useState(initialData?.completed || false);
    const [isPR, setIsPR] = useState(false);

    const isCardio = type === 'Cardio' || type === 'Stretch';
    const isStretch = type === 'Stretch';

    const isPush = suggestion?.isPush; // Check if it's an Overload suggestion

    // Apply Suggestion
    const applySuggestion = () => {
        if (!suggestion) return;
        setWeight(suggestion.weight);
        setReps(suggestion.reps);

        // Haptic Feedback for "Locking in" the smart value
        if (navigator.vibrate) navigator.vibrate(20);
    };

    // Calculate Dynamic Styling
    const getInputStyle = (inputType) => {
        const baseStyle = {
            background: 'var(--surface-highlight)',
            width: '100%',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            textAlign: 'center',
            border: '1px solid transparent',
            transition: 'all 0.2s',
            color: 'var(--text-main)',
            fontWeight: '600'
        };

        const currentVal = inputType === 'weight' ? parseFloat(weight) : parseFloat(reps);
        const ghostVal = suggestion ? (inputType === 'weight' ? suggestion.weight : suggestion.reps) : (previousData ? (inputType === 'weight' ? previousData.lastWeight : previousData.lastReps) : 0);

        // 1. Gold Border if PR
        if (isPR && inputType === 'weight') {
            baseStyle.border = '2px solid #fbbf24'; // Gold
            baseStyle.boxShadow = '0 0 10px rgba(251, 191, 36, 0.3)';
        }
        // 2. Fire Badge (Simulated validation visual)
        else if (currentVal > ghostVal && ghostVal > 0) {
            // Beating the ghost? Subtle highlight
            baseStyle.border = '1px solid var(--accent)';
        }

        return baseStyle;
    };

    // Trigger Haptic on PR
    useEffect(() => {
        if (isPR && navigator.vibrate) {
            navigator.vibrate([30, 50, 30]); // Short Double Pulse
        }
    }, [isPR]);

    const handleBlur = () => {
        // Optional: formatting or auto-save draft
    };

    const handleDurationChange = (val) => {
        setDurationStr(val);
        // Simple parsing: if contains ':', assume MM:SS, else assume Minutes
        if (val.includes(':')) {
            const [m, s] = val.split(':').map(str => parseFloat(str) || 0);
            setReps((m * 60) + s);
        } else {
            setReps((parseFloat(val) || 0) * 60);
        }
    };

    const handleLog = () => {
        if ((!weight && weight !== 0) && (!reps && reps !== 0)) return;

        const newLoggedState = !isLogged;
        const logData = {
            weight: parseFloat(weight) || 0,
            reps: parseFloat(reps) || 0,
            rpe: parseFloat(rpe) || 0,
            completed: newLoggedState
        };

        // Determine PR locally if we can, or rely on parent
        onLog(logData);
        setIsLogged(newLoggedState);

        // Haptic
        if (navigator.vibrate) navigator.vibrate(newLoggedState ? 50 : 20);
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

            {/* Coach Suggestion Badge */}
            {suggestion && suggestion.reason && !isLogged && (
                <div
                    onClick={applySuggestion}
                    style={{ gridColumn: '1 / -1', cursor: 'pointer', textAlign: 'left', fontSize: '0.75rem', color: '#0ea5e9', marginBottom: '4px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.9 }}>
                    <span style={{ fontSize: '0.85rem' }}>🤖</span> {suggestion.reason} <span style={{ textDecoration: 'underline', marginLeft: 'auto' }}>Tap to Apply</span>
                </div>
            )}

            {/* Input 1: Weight (Strength) OR Distance/Intensity (Cardio) */}
            <div style={{ position: 'relative' }}>
                <input
                    type={isCardio ? "text" : "number"}
                    placeholder={
                        suggestion && isPush && !weight
                            ? "" // Hide native placeholder to let blue overlay show cleanly
                            : suggestion
                                ? `${suggestion.weight}kg`
                                : (isCardio ? (isStretch ? 'Reps/Time' : 'Dist (km)') : (previousData ? previousData.lastWeight : '-'))
                    }
                    className={isPush && !weight ? "placeholder-blue" : ""}
                    value={isLogged ? ((initialData?.weight && initialData.weight !== 0) ? initialData.weight : '') : weight}
                    onChange={(e) => setWeight(e.target.value)}
                    onBlur={handleBlur}
                    onClick={() => {
                        // Quick-Fill on Click if empty and suggestion exists
                        if (isPush && !weight && suggestion) applySuggestion();
                    }}
                    disabled={isLogged}
                    style={{
                        ...getInputStyle('weight'),
                        // Overwrite color for placeholder logic via CSS class or inline mock?
                        // Inline mock for colored placeholder is hard in pure JS.
                        // But we can color the text blue if empty? No, input text color is for value.
                        // We will use a label overlay or just rely on the 'placeholder-blue' class being added globally?
                        // Let's assume we can't easily style placeholder color inline safely without ::placeholder pseudo.
                        // Hack: If empty and isPush, we show the VALUE as suggestion and select it?
                        // No, that's annoying.
                        // Better: We add a small floating label "Target: 50kg" in Blue above.
                    }}
                />
                {!isCardio && <span style={{ position: 'absolute', right: '4px', top: '12px', fontSize: '0.6rem', color: 'var(--text-dim)' }}>kg</span>}

                {/* Blue Ghost Floating Label */}
                {isPush && !weight && suggestion && (
                    <div
                        onClick={applySuggestion}
                        style={{
                            position: 'absolute',
                            left: 0, right: 0, top: 0, bottom: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#0ea5e9', // Blue-500
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            background: 'rgba(14, 165, 233, 0.1)',
                            pointerEvents: 'none', // Let input handle click? No, we want to capture click to fill?
                            // Actually input handles click.
                        }}
                    >
                        {suggestion.weight}
                    </div>
                )}
            </div>

            {/* Input 2: Reps (Strength) OR Duration (Cardio) */}
            <div style={{ position: 'relative' }}>
                <input
                    type={isCardio ? "text" : "number"}
                    placeholder={suggestion && isPush && !reps ? "" : (suggestion ? `${suggestion.reps}` : (isCardio ? 'Time (min)' : (previousData ? previousData.lastReps : '-')))}
                    value={isLogged ? ((isCardio && durationStr) ? durationStr : ((initialData?.reps && initialData.reps !== 0) ? initialData.reps : '')) : (isCardio ? durationStr : reps)}
                    onChange={(e) => isCardio ? handleDurationChange(e.target.value) : setReps(e.target.value)}
                    onBlur={handleBlur}
                    onClick={() => {
                        if (isPush && !reps && suggestion) applySuggestion();
                    }}
                    disabled={isLogged}
                    style={getInputStyle('reps')}
                />
                {/* Blue Ghost Floating Label for Reps */}
                {isPush && !reps && suggestion && (
                    <div
                        style={{
                            position: 'absolute',
                            left: 0, right: 0, top: 0, bottom: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#0ea5e9',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            background: 'rgba(14, 165, 233, 0.1)',
                            pointerEvents: 'none'
                        }}
                    >
                        {suggestion.reps}
                    </div>
                )}
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
                    fontSize: '0.9rem',
                    border: 'none'
                }}
            />

            {/* Action Button */}
            <button
                onClick={handleLog}
                style={{
                    background: isLogged ? 'var(--success)' : (isPush && weight && reps ? '#0ea5e9' : 'var(--primary)'), // Blue check if pushing?
                    color: isLogged ? '#FFF' : '#000',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: isLogged ? 'scale(0.95)' : 'scale(1)'
                }}
            >
                {isLogged ? '✓' : (isPush && weight && reps ? '🔥' : '+')}
            </button>

            {/* PR Toast / Badge Row */}
            {(isPR || (isPush && isLogged)) && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '-4px' }}>
                    {isPR ? <span style={{ color: '#fbbf24' }}>🏆 NEW PR!</span> : <span style={{ color: '#0ea5e9' }}>🔥 OVERLOAD!</span>}
                </div>
            )}
        </div>
    );
}
