import { useState } from 'react';
import { motion } from 'framer-motion';

import InteractiveMuscleMap from '@/components/muscles/InteractiveMuscleMap';
import { LOGICAL_MUSCLES } from '@/lib/muscleEngine/muscleMapper';

export default function ExerciseEditorModal({ exercise = null, onClose, onSave }) {
    const [name, setName] = useState(exercise?.name || '');
    const [type, setType] = useState(exercise?.type || 'Kraft'); // Kraft, Cardio, Sport, Mobility, Walk
    const [equipmentType, setEquipmentType] = useState(exercise?.equipment_type || 'barbell');
    const [trackingType, setTrackingType] = useState(exercise?.tracking_type || 'WEIGHT_REPS');
    const [engagement, setEngagement] = useState(
        exercise?.muscle_engagement && Object.keys(exercise.muscle_engagement).length > 0 
            ? exercise.muscle_engagement 
            : {} 
    );
    const [isUnilateral, setIsUnilateral] = useState(exercise?.is_unilateral || false);
    const [videoUrl, setVideoUrl] = useState(exercise?.video_url || '');
    const [defaultIncrement, setDefaultIncrement] = useState(exercise?.default_increment || 2.5);
    const [svgView, setSvgView] = useState('front');

    const handleMuscleClick = (logicalMuscle) => {
        setEngagement(prev => {
            const current = prev[logicalMuscle] || 0;
            let next = 0;
            if (current === 0) next = 0.3;
            else if (current === 0.3) next = 0.7;
            else if (current === 0.7) next = 1.0;
            else next = 0;

            const updated = { ...prev };
            if (next === 0) {
                delete updated[logicalMuscle];
            } else {
                updated[logicalMuscle] = next;
            }
            return updated;
        });
    };

    const handleSave = () => {
        if (!name.trim()) return alert("Name required");
        onSave({
            id: exercise?.id,
            name: name.trim(),
            type,
            equipment_type: equipmentType,
            tracking_type: trackingType,
            primary_muscles: [], // Legacy compat
            secondary_muscles: [], // Legacy compat
            muscle_engagement: engagement,
            is_unilateral: isUnilateral,
            video_url: videoUrl,
            default_increment: parseFloat(defaultIncrement) || 0
        });
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
        }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    background: '#1a1a1a',
                    padding: '32px',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '900px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    border: '1px solid #333',
                    color: '#fff'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                        {exercise ? 'Edit Exercise' : 'Create New Exercise'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Basic Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '8px' }}>Exercise Name</label>
                            <input 
                                value={name} 
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Incline Bench Press"
                                style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '8px' }}>Category</label>
                            <select 
                                value={type} 
                                onChange={e => setType(e.target.value)}
                                style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                            >
                                <option value="Kraft">Kraft (Strength)</option>
                                <option value="Cardio">Cardio</option>
                                <option value="Sport">Sport</option>
                                <option value="Mobility">Mobility</option>
                                <option value="Walk">Walk</option>
                            </select>
                        </div>
                    </div>

                    {/* Technical Config */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '8px' }}>Tracking Type</label>
                            <select 
                                value={trackingType} 
                                onChange={e => setTrackingType(e.target.value)}
                                style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                            >
                                <option value="WEIGHT_REPS">Weight & Reps</option>
                                <option value="TIME_DISTANCE">Time & Distance</option>
                                <option value="TIME_ONLY">Time Only (e.g. Planks)</option>
                                <option value="REPS_ONLY">Reps Only (e.g. Push Ups)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '8px' }}>Equipment</label>
                            <select 
                                value={equipmentType} 
                                onChange={e => setEquipmentType(e.target.value)}
                                style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                            >
                                <option value="barbell">Barbell</option>
                                <option value="dumbbell">Dumbbell</option>
                                <option value="machine">Machine</option>
                                <option value="cable">Cable</option>
                                <option value="bodyweight">Bodyweight</option>
                                <option value="other">Other / Cardio</option>
                            </select>
                        </div>
                    </div>

                    {/* Specific Settings */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#222', padding: '16px', borderRadius: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={isUnilateral} 
                                onChange={e => setIsUnilateral(e.target.checked)}
                                style={{ width: '20px', height: '20px', accentColor: '#FFC800' }}
                            />
                            <div>
                                <div style={{ fontWeight: 'bold' }}>Unilateral Movement</div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>Calculates volume per side (x2)</div>
                            </div>
                        </label>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '8px' }}>Default Increment (kg / pace)</label>
                            <input 
                                type="number" step="0.5"
                                value={defaultIncrement} 
                                onChange={e => setDefaultIncrement(e.target.value)}
                                style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                            />
                        </div>
                    </div>

                    {/* Live Editor Engine */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#888' }}>Live Editor Engine (Click muscles to toggle intensity)</label>
                            <button 
                                onClick={() => setSvgView(prev => prev === 'front' ? 'rear' : 'front')}
                                style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                🔄 {svgView === 'front' ? 'Rear View' : 'Front View'}
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', background: '#000', padding: '24px', borderRadius: '12px', border: '1px solid #333', minHeight: '400px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <InteractiveMuscleMap 
                                    activeMuscles={engagement} 
                                    view={svgView} 
                                    onMuscleClick={handleMuscleClick} 
                                    width={180} height={380} 
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '380px', overflowY: 'auto', paddingRight: '12px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#888', position: 'sticky', top: 0, background: '#000', paddingBottom: '8px', zIndex: 2 }}>
                                    Fine-tune intensities:
                                </div>
                                {Object.keys(engagement).length === 0 ? (
                                    <div style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center', marginTop: '40px' }}>No muscles selected.</div>
                                ) : (
                                    Object.entries(engagement).map(([muscle, value]) => (
                                        <div key={muscle} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#111', padding: '8px 12px', borderRadius: '8px', border: '1px solid #222' }}>
                                            <div style={{ width: '90px', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                                                {muscle.replace('_', ' ')}
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0.1" max="1.0" step="0.1" 
                                                value={value} 
                                                onChange={(e) => setEngagement(p => ({ ...p, [muscle]: parseFloat(e.target.value) }))}
                                                style={{ flex: 1, accentColor: '#faff00', minWidth: '60px' }}
                                            />
                                            <div style={{ width: '40px', fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold' }}>
                                                {Math.round(value * 100)}%
                                            </div>
                                            <button 
                                                onClick={() => setEngagement(p => { const n = {...p}; delete n[muscle]; return n; })}
                                                style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
                                            >×</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Video URL */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '8px' }}>Video URL (Optional)</label>
                        <input 
                            value={videoUrl} 
                            onChange={e => setVideoUrl(e.target.value)}
                            placeholder="https://..."
                            style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                    <button 
                        onClick={onClose}
                        style={{ flex: 1, padding: '16px', background: '#333', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        style={{ flex: 2, padding: '16px', background: '#FFC800', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        {exercise ? 'Save Changes' : 'Create Exercise'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
