"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CreateMissionPage() {
    const { user } = useStore();
    const [supabase] = useState(() => createClient());
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    const editScope = searchParams.get('scope');

    const [loading, setLoading] = useState(false);

    // Form State
    const [scope, setScope] = useState('SOLO'); // 'SOLO' | 'GROUP'
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'daily', // Only for SOLO
        metric: 'workouts',
        target_value: 1,
        xp_reward: 100,
        focus: [] // Array of strings
    });

    // Fetch existing data if editing
    useEffect(() => {
        if (editId && editScope) {
            setLoading(true);
            const table = editScope === 'SOLO' ? 'operations_templates' : 'community_goal_templates';
            supabase.from(table).select('*').eq('id', editId).single()
                .then(({ data, error }) => {
                    if (data) {
                        setFormData({
                            title: data.title,
                            description: data.description,
                            type: data.type || 'daily',
                            metric: (data.target_metric || data.metric || 'workouts').toLowerCase(),
                            target_value: data.target_value,
                            xp_reward: data.xp_reward,
                            focus: data.focus || []
                        });
                        setScope(editScope);
                    } else {
                        console.error('Error fetching template:', error);
                    }
                    setLoading(false);
                });
        }
    }, [editId, editScope]);

    const FOCUS_OPTIONS = ['Hypertrophy', 'Strength', 'Endurance', 'Weight Loss', 'Consistency'];
    const METRIC_OPTIONS = ['workouts', 'volume', 'distance', 'duration'];

    const handleFocusToggle = (tag) => {
        setFormData(prev => {
            const newFocus = prev.focus.includes(tag)
                ? prev.focus.filter(t => t !== tag)
                : [...prev.focus, tag];
            return { ...prev, focus: newFocus };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { title, description, type, metric, target_value, xp_reward, focus } = formData;

            if (!title || !target_value || !xp_reward) {
                alert("Please fill in all required fields.");
                setLoading(false);
                return;
            }

            let error;
            const payload = {
                title,
                description,
                metric,
                target_value,
                xp_reward,
                focus: focus.length > 0 ? focus : null
            };

            if (scope === 'SOLO') {
                payload.type = type; // daily/weekly
                payload.target_metric = metric; // Solo uses target_metric
                delete payload.metric;

                if (editId) {
                    const { error: err } = await supabase.from('operations_templates').update(payload).eq('id', editId);
                    error = err;
                } else {
                    const { error: err } = await supabase.from('operations_templates').insert(payload);
                    error = err;
                }
            } else {
                // GROUP
                payload.metric = metric.toUpperCase(); // DB expects uppercase for Group

                if (editId) {
                    const { error: err } = await supabase.from('community_goal_templates').update(payload).eq('id', editId);
                    error = err;
                } else {
                    const { error: err } = await supabase.from('community_goal_templates').insert(payload);
                    error = err;
                }
            }

            if (error) throw error;

            alert(`Mission ${editId ? 'Updated' : 'Launched'} Successfully! 🚀`);
            router.push('/admin/missions');

        } catch (err) {
            console.error("Submission Error:", err);
            alert("Failed to save mission: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ minHeight: '100vh', background: '#111', color: '#fff', fontFamily: 'Inter', padding: '40px 20px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <header style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
                    <button
                        onClick={() => router.push('/admin/missions')}
                        style={{ background: 'none', border: '1px solid #444', color: '#888', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}
                    >
                        ←
                    </button>
                    <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>
                        {editId ? 'EDIT' : 'NEW'} <span style={{ color: '#FFC800' }}>MISSION</span>
                    </h1>
                </header>

                <div style={{ background: '#222', padding: '32px', borderRadius: '16px' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Scope Toggle - Locked if Editing */}
                        {!editId && (
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <label style={{ flex: 1, cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="scope"
                                        checked={scope === 'SOLO'}
                                        onChange={() => setScope('SOLO')}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        padding: '16px',
                                        textAlign: 'center',
                                        borderRadius: '8px',
                                        background: scope === 'SOLO' ? '#FFC800' : '#333',
                                        color: scope === 'SOLO' ? '#000' : '#888',
                                        fontWeight: 'bold',
                                        border: scope === 'SOLO' ? '2px solid #FFC800' : '2px solid #444'
                                    }}>
                                        👤 SOLO OPERATION
                                    </div>
                                </label>
                                <label style={{ flex: 1, cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="scope"
                                        checked={scope === 'GROUP'}
                                        onChange={() => setScope('GROUP')}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        padding: '16px',
                                        textAlign: 'center',
                                        borderRadius: '8px',
                                        background: scope === 'GROUP' ? '#00A3FF' : '#333',
                                        color: scope === 'GROUP' ? '#000' : '#888',
                                        fontWeight: 'bold',
                                        border: scope === 'GROUP' ? '2px solid #00A3FF' : '2px solid #444'
                                    }}>
                                        👥 TEAM GOAL
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* Title & Desc */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>Codename (Title)</label>
                            <input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Operation Iron Storm"
                                style={{ padding: '12px', background: '#333', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '1rem' }}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>Briefing (Description)</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief instructions for the operative..."
                                style={{ padding: '12px', background: '#333', border: '1px solid #444', borderRadius: '8px', color: '#fff', minHeight: '80px', fontFamily: 'Inter' }}
                            />
                        </div>

                        {/* Config Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {scope === 'SOLO' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>Duration Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        style={{ padding: '12px', background: '#333', border: '1px solid #444', borderRadius: '8px', color: '#fff' }}
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                    </select>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>Metric</label>
                                <select
                                    value={formData.metric}
                                    onChange={e => setFormData({ ...formData, metric: e.target.value })}
                                    style={{ padding: '12px', background: '#333', border: '1px solid #444', borderRadius: '8px', color: '#fff' }}
                                >
                                    {METRIC_OPTIONS.map(m => (
                                        <option key={m} value={m}>{m.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>Target Value</label>
                                <input
                                    type="number"
                                    value={formData.target_value}
                                    onChange={e => setFormData({ ...formData, target_value: parseInt(e.target.value) || 0 })}
                                    style={{ padding: '12px', background: '#333', border: '1px solid #444', borderRadius: '8px', color: '#fff' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>XP Reward</label>
                                <input
                                    type="number"
                                    value={formData.xp_reward}
                                    onChange={e => setFormData({ ...formData, xp_reward: parseInt(e.target.value) || 0 })}
                                    style={{ padding: '12px', background: '#333', border: '1px solid #444', borderRadius: '8px', color: '#fff' }}
                                />
                            </div>
                        </div>

                        {/* Focus Tags */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>Target Focus (Algorithm Logic)</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {FOCUS_OPTIONS.map(tag => {
                                    const isSelected = formData.focus.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => handleFocusToggle(tag)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '20px',
                                                border: isSelected ? '1px solid #FFC800' : '1px solid #444',
                                                background: isSelected ? 'rgba(255, 200, 0, 0.1)' : 'transparent',
                                                color: isSelected ? '#FFC800' : '#888',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            {tag} {isSelected && '✓'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: '20px',
                                padding: '16px',
                                background: loading ? '#555' : (scope === 'SOLO' ? '#FFC800' : '#00A3FF'),
                                color: loading ? '#888' : '#000',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Processing...' : (editId ? 'UPDATE MISSION 💾' : 'LAUNCH MISSION 🚀')}
                        </button>

                    </form>
                </div>
                <style jsx>{`
                    @media (max-width: 600px) {
                        .config-grid {
                            grid-template-columns: 1fr !important;
                        }
                        .scope-toggle {
                            flex-direction: column;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}
