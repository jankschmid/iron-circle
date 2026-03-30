"use client";

import { useState, useEffect } from 'react';

export default function ExerciseLogger({ exerciseId, setId, previousData, onLog, initialData, type = 'Strength', suggestion = null, isTopSet = false }) {
    const getInitialWeight = () => {
        if (initialData?.weight && initialData.weight !== 0) return initialData.weight;
        return '';
    };

    const getInitialReps = () => {
        if (initialData?.reps && initialData.reps !== 0) return initialData.reps;
        return '';
    };

    const [weight, setWeight] = useState(getInitialWeight());
    const [reps, setReps] = useState(getInitialReps());
    const [durationStr, setDurationStr] = useState('');
    const [rpe, setRpe] = useState(initialData?.rpe || '');
    const [isLogged, setIsLogged] = useState(initialData?.completed || false);
    const [isPR, setIsPR] = useState(false);

    const isCardio = type === 'Cardio' || type === 'Stretch';
    const isStretch = type === 'Stretch';
    const isPush = suggestion?.isPush;

    const applySuggestion = () => {
        if (!suggestion) return;
        setWeight(suggestion.weight);
        setReps(suggestion.reps);
        if (navigator.vibrate) navigator.vibrate(20);
    };

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

        if (isPR && inputType === 'weight') {
            baseStyle.border = '2px solid #fbbf24';
            baseStyle.boxShadow = '0 0 10px rgba(251, 191, 36, 0.3)';
        } else if (currentVal > ghostVal && ghostVal > 0) {
            baseStyle.border = '1px solid var(--accent)';
        }
        return baseStyle;
    };

    useEffect(() => {
        if (isPR && navigator.vibrate) {
            navigator.vibrate([30, 50, 30]);
        }
    }, [isPR]);

    const handleDurationChange = (val) => {
        setDurationStr(val);
        if (val.includes(':')) {
            const [m, s] = val.split(':').map(str => parseFloat(str) || 0);
            setReps((m * 60) + s);
        } else {
            setReps((parseFloat(val) || 0) * 60);
        }
    };

    const handleLog = () => {
        let finalWeight = parseFloat(weight);
        let finalReps = parseFloat(reps);

        if (isNaN(finalWeight)) {
            if (isPush && suggestion?.weight !== undefined) finalWeight = parseFloat(suggestion.weight);
            else if (previousData?.lastWeight !== undefined) finalWeight = parseFloat(previousData.lastWeight);
            else finalWeight = 0;

            if (!isCardio) setWeight(finalWeight === 0 ? '' : finalWeight);
        }

        if (isNaN(finalReps)) {
            if (isPush && suggestion?.reps !== undefined) finalReps = parseFloat(suggestion.reps);
            else if (previousData?.lastReps !== undefined) finalReps = parseFloat(previousData.lastReps);
            else finalReps = 0;

            if (!isCardio) setReps(finalReps === 0 ? '' : finalReps);
        }

        if (finalWeight === 0 && finalReps === 0) return;

        const toggledLoggedState = !isLogged;
        
        // Calculate RIR silently in the background (0-10 RPE -> RIR)
        let finalRpe = parseFloat(rpe);
        let finalRir = null;
        if (!isNaN(finalRpe)) {
            finalRir = Math.max(0, 10 - finalRpe);
        }

        const logData = {
            weight: finalWeight || 0,
            reps: finalReps || 0,
            rpe: isNaN(finalRpe) ? 0 : finalRpe,
            rir: finalRir,
            completed: toggledLoggedState
        };

        onLog(logData);
        setIsLogged(toggledLoggedState);
        if (navigator.vibrate) navigator.vibrate(toggledLoggedState ? 50 : 20);
    };

    // Render Smart Badge
    const renderSmartBadge = () => {
        if (!suggestion || !suggestion.progression_status || isLogged) return null;
        
        let badgeText = '';
        let badgeColor = '';
        
        const diff = previousData?.lastWeight ? suggestion.weight - previousData.lastWeight : 0;
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        
        if (suggestion.progression_status === 'level_up' || suggestion.progression_status === 'spike') {
            badgeText = `🟢 ⬆️ ${diffStr}kg`;
            badgeColor = 'var(--success)';
        } else if (suggestion.progression_status === 'mastery') {
            badgeText = '🟡 🔒 Form Check';
            badgeColor = 'var(--warning)';
        } else if (suggestion.progression_status === 'deload' || suggestion.progression_status === 'wall_1') {
            badgeText = '🔵 🪶 Recovery';
            badgeColor = '#0ea5e9';
        } else {
            return null; // Don't render for 'new'
        }

        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: `${badgeColor}22`, 
                border: `1px solid ${badgeColor}`, 
                color: badgeColor, 
                padding: '4px 10px', 
                borderRadius: '16px', 
                fontSize: '0.75rem', 
                fontWeight: 'bold',
                marginBottom: '8px',
                cursor: 'pointer'
            }} onClick={applySuggestion}>
                {badgeText}
            </div>
        );
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            marginBottom: '12px',
            opacity: isLogged ? 0.7 : 1,
            transition: 'opacity 0.3s'
        }}>
            {/* Coach Suggestion / Smart Badge */}
            {suggestion && !isLogged && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {renderSmartBadge()}
                    {suggestion.reason && !renderSmartBadge() && (
                        <div onClick={applySuggestion} style={{ cursor: 'pointer', fontSize: '0.75rem', color: '#0ea5e9', marginBottom: '8px', fontWeight: '500' }}>
                            <span style={{ fontSize: '0.85rem' }}>🤖</span> {suggestion.reason}
                        </div>
                    )}
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: isCardio
                    ? 'minmax(80px, 1fr) minmax(80px, 1fr) minmax(40px, 1fr) 40px'
                    : 'minmax(50px, 1fr) minmax(50px, 1fr) minmax(40px, 1fr) 40px',
                gap: '8px',
                alignItems: 'center',
            }}>
                {/* Input 1: Weight */}
                <div style={{ position: 'relative' }}>
                    <input
                        type={isCardio ? "text" : "number"}
                        placeholder={
                            suggestion && isPush && !weight
                                ? "" 
                                : suggestion
                                    ? `${suggestion.weight}kg`
                                    : (isCardio ? (isStretch ? 'Reps/Time' : 'Dist (km)') : (previousData ? previousData.lastWeight : '-'))
                        }
                        value={isLogged ? (weight !== '' ? weight : ((initialData?.weight && initialData.weight !== 0) ? initialData.weight : '')) : weight}
                        onChange={(e) => setWeight(e.target.value)}
                        onClick={() => { if (isPush && !weight && suggestion) applySuggestion(); }}
                        disabled={isLogged}
                        style={getInputStyle('weight')}
                    />
                    {!isCardio && <span style={{ position: 'absolute', right: '4px', top: '12px', fontSize: '0.6rem', color: 'var(--text-dim)' }}>kg</span>}

                    {isPush && !weight && suggestion && (
                        <div onClick={applySuggestion} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', fontWeight: 'bold', fontSize: '0.9rem', background: 'rgba(14, 165, 233, 0.1)', pointerEvents: 'none' }}>
                            {typeof suggestion.weight === 'object' ? String(suggestion.weight.weight || '') : String(suggestion.weight)}
                        </div>
                    )}
                </div>

                {/* Input 2: Reps */}
                <div style={{ position: 'relative' }}>
                    <input
                        type={isCardio ? "text" : "number"}
                        placeholder={suggestion && isPush && !reps ? "" : (suggestion ? `${suggestion.reps}` : (isCardio ? 'Time (min)' : (previousData ? previousData.lastReps : '-')))}
                        value={isLogged ? ((isCardio && durationStr) ? durationStr : (reps !== '' ? reps : ((initialData?.reps && initialData.reps !== 0) ? initialData.reps : ''))) : (isCardio ? durationStr : reps)}
                        onChange={(e) => isCardio ? handleDurationChange(e.target.value) : setReps(e.target.value)}
                        onClick={() => { if (isPush && !reps && suggestion) applySuggestion(); }}
                        disabled={isLogged}
                        style={getInputStyle('reps')}
                    />
                    {isPush && !reps && suggestion && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', fontWeight: 'bold', fontSize: '0.9rem', background: 'rgba(14, 165, 233, 0.1)', pointerEvents: 'none' }}>
                            {typeof suggestion.reps === 'object' ? String(suggestion.reps.reps || '') : String(suggestion.reps)}
                        </div>
                    )}
                </div>

                {/* RPE & Normal + Button */}
                <input
                    type="number"
                    placeholder={isCardio ? "Intens." : "RPE"}
                    min="0" max="10"
                    value={rpe}
                    onChange={(e) => {
                        if (e.target.value === '') {
                            setRpe('');
                            return;
                        }
                        let val = parseFloat(e.target.value);
                        if (val > 10) val = 10;
                        if (val < 0) val = 0;
                        setRpe(val);
                    }}
                    disabled={isLogged}
                    style={{ background: 'var(--surface-highlight)', color: 'var(--text-muted)', width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: '0.9rem', border: 'none' }}
                />
                <button
                    onClick={handleLog}
                    style={{ background: isLogged ? 'var(--success)' : (isPush && weight && reps ? '#0ea5e9' : 'var(--primary)'), color: isLogged ? '#FFF' : '#000', border: 'none', borderRadius: 'var(--radius-sm)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', transform: isLogged ? 'scale(0.95)' : 'scale(1)' }}
                >
                    {isLogged ? '✓' : (isPush && weight && reps ? '🔥' : '+')}
                </button>
            </div>

            {/* PR Toast / Badge Row */}
            {(isPR || (isPush && isLogged)) && (
                <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '8px' }}>
                    {isPR ? <span style={{ color: '#fbbf24' }}>🏆 NEW PR!</span> : <span style={{ color: '#0ea5e9' }}>🔥 OVERLOAD!</span>}
                </div>
            )}
        </div>
    );
}
