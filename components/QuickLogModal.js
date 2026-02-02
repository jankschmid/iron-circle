import { useState } from 'react';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuickLogModal({ onClose, activePlanId, dayId }) {
    const { createManualWorkout, exercises, exerciseError, refreshExercises } = useStore();
    const [loading, setLoading] = useState(false);

    // Session State
    const [addedActivities, setAddedActivities] = useState([]); // { id, name, duration, type }

    // Current Selection State
    const [activityType, setActivityType] = useState('Cardio');
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [duration, setDuration] = useState(30);
    const [notes, setNotes] = useState('');

    const activities = [
        { label: 'Cardio', icon: '🏃' },
        { label: 'Stretch', icon: '🧘' },
        { label: 'Mobility', icon: '🤸' },
        { label: 'Sport', icon: '🏀' },
        { label: 'Walk', icon: '🚶' }
    ];

    // Filter exercises based on selected type
    const filteredExercises = exercises.filter(ex =>
        ex.type && ex.type.toLowerCase() === activityType.toLowerCase()
    );

    const handleAddActivity = () => {
        if (!duration) return;

        const selectedEx = exercises.find(e => e.id === selectedExerciseId);
        const name = selectedEx ? selectedEx.name : `General ${activityType}`;

        const newActivity = {
            id: selectedEx ? selectedEx.id : `temp-${Date.now()}`,
            name,
            duration: parseInt(duration),
            type: activityType,
            exerciseId: selectedEx ? selectedEx.id : null
        };

        setAddedActivities([...addedActivities, newActivity]);

        // Reset selection for next add (keep type, reset specific)
        setSelectedExerciseId('');
        // Optional: Keep duration or reset? Keep it for convenience.
    };

    const handleRemoveActivity = (index) => {
        const newActivities = [...addedActivities];
        newActivities.splice(index, 1);
        setAddedActivities(newActivities);
    };

    const handleSaveSession = async () => {
        setLoading(true);

        try {
            // If no added activities but user has selection, treat as single activity
            let finalActivities = [...addedActivities];
            if (finalActivities.length === 0) {
                const selectedEx = exercises.find(e => e.id === selectedExerciseId);
                finalActivities.push({
                    name: selectedEx ? selectedEx.name : `${activityType} Session`,
                    duration: parseInt(duration),
                    type: activityType,
                    exerciseId: selectedEx ? selectedEx.id : null
                });
            }

            if (finalActivities.length === 0) {
                alert("Please add at least one activity.");
                setLoading(false);
                return;
            }

            // Construct Name
            // e.g. "Cardio & Stretch" or "Basketball"
            const types = [...new Set(finalActivities.map(a => a.type))];
            const workoutName = finalActivities.length === 1 ? finalActivities[0].name : `${types.join(' & ')} Session`;

            // Construct Logs
            let logs = [];
            finalActivities.forEach(act => {
                if (act.exerciseId) {
                    logs.push({
                        exercise_id: act.exerciseId,
                        sets: [{ duration: act.duration * 60, weight: 0, reps: 0, completed: true }]
                    });
                }
            });

            const totalDuration = finalActivities.reduce((acc, curr) => acc + curr.duration, 0);

            await createManualWorkout({
                name: workoutName,
                date: new Date().toISOString(),
                duration: totalDuration * 60,
                volume: 0,
                logs: logs,
                planId: activePlanId,
                dayId: dayId,
                notes: notes, // Append details about generic activities to notes?
                type: 'activity'
            });
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to log activity");
        } finally {
            setLoading(false);
        }
    };

    const totalSessionDuration = addedActivities.reduce((acc, curr) => acc + curr.duration, 0) + (addedActivities.length === 0 ? parseInt(duration) : 0);

    return (
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
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                    background: 'var(--surface)',
                    width: '100%',
                    maxWidth: '450px',
                    borderRadius: '20px',
                    padding: '24px',
                    border: '1px solid var(--border)',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Log Activity</h2>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Build your session</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-muted)' }}>×</button>
                </div>

                {/* --- BUILDER SECTION --- */}
                <div style={{ background: 'var(--surface-highlight)', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>

                    {/* Activity Type Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
                        {activities.map(act => (
                            <button
                                key={act.label}
                                onClick={() => {
                                    setActivityType(act.label);
                                    setSelectedExerciseId('');
                                }}
                                style={{
                                    background: activityType === act.label ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    color: activityType === act.label ? 'black' : 'var(--text-muted)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px',
                                    cursor: 'pointer',
                                    fontSize: '0.7rem'
                                }}
                            >
                                <span style={{ fontSize: '1.2rem' }}>{act.icon}</span>
                                <span>{act.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Exercise & Type Debug */}
                    {filteredExercises.length > 0 ? (
                        <div style={{ marginBottom: '16px' }}>
                            <select
                                value={selectedExerciseId}
                                onChange={(e) => setSelectedExerciseId(e.target.value)} // Fix: Ensure event target value is used
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="">General {activityType} (No Specific Exercise)</option>
                                {filteredExercises.map(ex => (
                                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px', background: 'var(--background)', borderRadius: '8px' }}>
                            Using "General {activityType}"
                            {refreshExercises && <span onClick={refreshExercises} style={{ marginLeft: '8px', textDecoration: 'underline', cursor: 'pointer', color: 'var(--primary)' }}>Refresh Data</span>}
                        </div>
                    )}

                    {/* Duration Input */}
                    <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="range"
                            min="5" max="120" step="5"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            style={{ flex: 1, accentColor: 'var(--primary)' }}
                        />
                        <div style={{
                            background: 'var(--background)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            minWidth: '50px',
                            textAlign: 'center'
                        }}>
                            {duration}m
                        </div>
                    </div>

                    <button
                        onClick={handleAddActivity}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'white',
                            color: 'black',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        + Add {selectedExerciseId ? (exercises.find(e => e.id === selectedExerciseId)?.name || 'Activity') : `General ${activityType}`}
                    </button>
                </div>

                {/* --- ADDED LIST --- */}
                {addedActivities.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>Session Plan</div>
                        {addedActivities.map((act, idx) => (
                            <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px', background: 'var(--surface-highlight)', borderRadius: '12px', marginBottom: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{activities.find(a => a.label === act.type)?.icon}</span>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{act.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{act.duration} min</div>
                                    </div>
                                </div>
                                <button onClick={() => handleRemoveActivity(idx)} style={{ color: 'var(--error)', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                            </div>
                        ))}
                        <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Total: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{addedActivities.reduce((acc, c) => acc + c.duration, 0)} min</span>
                        </div>
                    </div>
                )}

                {/* Notes Input */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.9rem' }}>Notes (Optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="How was it?"
                        style={{
                            width: '100%',
                            background: 'var(--surface-highlight)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px',
                            color: 'white',
                            fontFamily: 'inherit',
                            resize: 'none',
                            height: '60px'
                        }}
                    />
                </div>

                <button
                    onClick={handleSaveSession}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: 'var(--primary)',
                        color: 'black',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Saving...' : `Save Session ${addedActivities.length > 0 ? `(${addedActivities.reduce((acc, c) => acc + c.duration, 0)}m)` : `(${duration}m)`}`}
                </button>

            </motion.div>
        </div>
    );
}

