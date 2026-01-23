"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';

export default function ExerciseLogger({ exerciseId, setId, previousData, onLog }) {
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [rpe, setRpe] = useState('');
    const [isLogged, setIsLogged] = useState(false);
    const [isPR, setIsPR] = useState(false);

    const handleLog = () => {
        if (!weight || !reps) return;

        // Convert to numbers
        const w = parseFloat(weight);
        const r = parseFloat(reps);

        // Check PR (Volume PR logic: Weight * Reps > Previous Max Volume)
        const currentVolume = w * r;
        const previousVolume = previousData ? previousData.lastWeight * previousData.lastReps : 0;

        if (currentVolume > previousVolume) {
            setIsPR(true);
        }

        onLog({ weight: w, reps: r, rpe });
        setIsLogged(true);
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
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
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
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
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
                placeholder="8"
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
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
                disabled={isLogged}
                style={{
                    background: isLogged ? 'var(--success)' : 'var(--primary)',
                    color: isLogged ? '#FFF' : '#000',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
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
