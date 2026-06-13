"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import PaginationControl from '@/components/ui/PaginationControl';
import ExerciseEditorModal from '@/components/ExerciseEditorModal';

export default function GlobalExercisesAdminPage() {
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 15;

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState(''); // empty = all
    const [selectedTracking, setSelectedTracking] = useState(''); // empty = all

    const MUSCLES = ['Chest', 'Back', 'Legs', 'Calves', 'Shoulders', 'Biceps', 'Triceps', 'Traps', 'Neck', 'Core', 'Cardio', 'Full Body', 'Other'];
    const TRACKING_TYPES = [
        { id: 'WEIGHT_REPS', label: 'Weight & Reps' },
        { id: 'TIME_DISTANCE', label: 'Time & Distance' },
        { id: 'TIME_ONLY', label: 'Time Only' },
        { id: 'REPS_ONLY', label: 'Reps Only' }
    ];

    // Modals
    const [showEditor, setShowEditor] = useState(false);
    const [editingExercise, setEditingExercise] = useState(null);

    const supabase = createClient();

    useEffect(() => {
        // Reset page on filter change
        setCurrentPage(0);
    }, [searchQuery, selectedMuscle, selectedTracking]);

    useEffect(() => {
        fetchExercises();
    }, [currentPage, searchQuery, selectedMuscle, selectedTracking]);

    const fetchExercises = async () => {
        setLoading(true);
        let query = supabase.from('exercises').select('*', { count: 'exact' });

        if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`);
        }
        if (selectedMuscle) {
            query = query.eq('muscle', selectedMuscle);
        }
        if (selectedTracking) {
            query = query.eq('tracking_type', selectedTracking);
        }

        query = query.order('name', { ascending: true })
                     .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

        const { data, count, error } = await query;
        if (error) {
            alert('Error fetching exercises: ' + error.message);
        } else {
            setExercises(data || []);
            setTotalCount(count || 0);
        }
        setLoading(false);
    };

    const handleSaveExercise = async (exerciseData) => {
        // Prepare payload, extracting 'muscle' from engagement if not explicitly set
        // (Legacy fallback)
        let primaryFallback = 'Other';
        if (exerciseData.muscle_engagement && Object.keys(exerciseData.muscle_engagement).length > 0) {
            // naive fallback: just pick the first one as legacy category
            primaryFallback = Object.keys(exerciseData.muscle_engagement)[0]; 
        }

        const payload = {
            name: exerciseData.name,
            type: exerciseData.type || 'Kraft',
            muscle: primaryFallback, // legacy field
            equipment_type: exerciseData.equipment_type || 'barbell',
            tracking_type: exerciseData.tracking_type || 'WEIGHT_REPS',
            primary_muscles: exerciseData.primary_muscles || [],
            secondary_muscles: exerciseData.secondary_muscles || [],
            muscle_engagement: exerciseData.muscle_engagement || {},
            is_unilateral: exerciseData.is_unilateral || false,
            video_url: exerciseData.video_url || '',
            default_increment: exerciseData.default_increment || 2.5
        };

        if (exerciseData.id) {
            // Update
            const { error } = await supabase.from('exercises').update(payload).eq('id', exerciseData.id);
            if (error) alert('Error updating: ' + error.message);
            else {
                setShowEditor(false);
                fetchExercises();
            }
        } else {
            // Create
            const { error } = await supabase.from('exercises').insert(payload);
            if (error) alert('Error creating: ' + error.message);
            else {
                setShowEditor(false);
                fetchExercises();
            }
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Are you sure you want to delete ${name}? This will affect all users!`)) return;
        const { error } = await supabase.from('exercises').delete().eq('id', id);
        if (error) alert('Error deleting: ' + error.message);
        else fetchExercises();
    };

    return (
        <div style={{ width: '100%' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                    <input 
                        type="text" 
                        placeholder="Search exercises..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ padding: '12px', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff', minWidth: '250px' }}
                    />
                    
                    <select 
                        value={selectedMuscle}
                        onChange={e => setSelectedMuscle(e.target.value)}
                        style={{ padding: '12px', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff' }}
                    >
                        <option value="">All Muscles</option>
                        {MUSCLES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <select 
                        value={selectedTracking}
                        onChange={e => setSelectedTracking(e.target.value)}
                        style={{ padding: '12px', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff' }}
                    >
                        <option value="">All Tracking Types</option>
                        {TRACKING_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                </div>
                
                <button 
                    onClick={() => { setEditingExercise(null); setShowEditor(true); }}
                    style={{ padding: '12px 24px', background: '#FFC800', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    + New Exercise
                </button>
            </div>

            <div style={{ background: '#222', borderRadius: '16px', overflow: 'hidden', maxWidth: '100%' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ background: '#333', textAlign: 'left', fontSize: '0.9rem', color: '#888', textTransform: 'uppercase' }}>
                                <th style={{ padding: '16px' }}>Name</th>
                                <th style={{ padding: '16px' }}>Legacy Muscle</th>
                                <th style={{ padding: '16px' }}>Tracking</th>
                                <th style={{ padding: '16px' }}>Unilateral</th>
                                <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</td></tr>
                            ) : exercises.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No exercises found.</td></tr>
                            ) : (
                                exercises.map(ex => (
                                    <tr key={ex.id} style={{ borderBottom: '1px solid #333' }}>
                                        <td style={{ padding: '16px', fontWeight: 'bold' }}>
                                            {ex.name}
                                            {ex.muscle_engagement && Object.keys(ex.muscle_engagement).length > 0 && (
                                                <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'normal', marginTop: '4px' }}>
                                                    {Object.keys(ex.muscle_engagement).length} mapped muscles
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px', color: '#ccc' }}>{ex.muscle || '—'}</td>
                                        <td style={{ padding: '16px', color: '#FFC800' }}>
                                            <span style={{ background: '#444', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                                                {ex.tracking_type || 'WEIGHT_REPS'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            {ex.is_unilateral ? '✅ Yes' : '❌ No'}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => { setEditingExercise(ex); setShowEditor(true); }}
                                                style={{ background: '#333', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', marginRight: '8px', cursor: 'pointer' }}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(ex.id, ex.name)}
                                                style={{ background: '#442222', border: 'none', color: '#ff4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <PaginationControl 
                    currentPage={currentPage}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onNext={() => setCurrentPage(p => p + 1)}
                    onPrev={() => setCurrentPage(p => p - 1)}
                />
            </div>

            {showEditor && (
                <ExerciseEditorModal 
                    exercise={editingExercise} 
                    onClose={() => setShowEditor(false)} 
                    onSave={handleSaveExercise} 
                />
            )}
        </div>
    );
}
