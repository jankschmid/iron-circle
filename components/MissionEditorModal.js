import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function MissionEditorModal({ missionId = null, defaultScope = 'SOLO', onClose, onSave }) {
    const { user } = useStore();
    const [supabase] = useState(() => createClient());

    const [loading, setLoading] = useState(false);
    const [translating, setTranslating] = useState(false);

    // Form State
    const [scope, setScope] = useState(defaultScope);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'daily',
        metric: 'workouts',
        target_value: 10,
        xp_reward: 800,
        focus: [],
        translations: {}
    });

    useEffect(() => {
        if (missionId) {
            setLoading(true);
            const table = defaultScope === 'SOLO' ? 'operations_templates' : 'community_goal_templates';
            supabase.from(table).select('*').eq('id', missionId).single()
                .then(({ data, error }) => {
                    if (data) {
                        setFormData({
                            title: data.title,
                            description: data.description,
                            type: data.type || 'daily',
                            metric: (data.target_metric || data.metric || 'workouts').toLowerCase(),
                            target_value: data.target_value,
                            xp_reward: data.xp_reward,
                            focus: data.focus || [],
                            translations: data.translations || {}
                        });
                        setScope(defaultScope);
                    } else {
                        console.error('Error fetching template:', error);
                    }
                    setLoading(false);
                });
        }
    }, [missionId, defaultScope]);

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

    const handleAutoTranslate = async () => {
        if (!formData.title || !formData.description) {
            alert("Please enter title and description first.");
            return;
        }
        setTranslating(true);
        try {
            const translations = { ...(formData.translations || {}) };
            const targetLangs = ['de', 'es', 'fr', 'it'];

            for (const lang of targetLangs) {
                const { data: titleData, error: titleErr } = await supabase.functions.invoke('translate', {
                    body: { texts: [formData.title], targetLang: lang }
                });
                if (titleErr) throw titleErr;

                const { data: descData, error: descErr } = await supabase.functions.invoke('translate', {
                    body: { texts: [formData.description], targetLang: lang }
                });
                if (descErr) throw descErr;

                translations[lang] = {
                    title: titleData.translations?.[0] || '',
                    description: descData.translations?.[0] || ''
                };
            }

            setFormData(prev => ({ ...prev, translations }));
            alert("Auto-translation complete for DE, ES, FR, IT!");
        } catch (err) {
            console.error("Translation Error:", err);
            alert("Translation failed. See console.");
        } finally {
            setTranslating(false);
        }
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
                focus: focus.length > 0 ? focus : null,
                translations: formData.translations
            };

            if (scope === 'SOLO') {
                payload.type = type;
                payload.target_metric = metric;
                delete payload.metric;

                if (missionId) {
                    const { error: err } = await supabase.from('operations_templates').update(payload).eq('id', missionId);
                    error = err;
                } else {
                    const { error: err } = await supabase.from('operations_templates').insert(payload);
                    error = err;
                }
            } else {
                payload.metric = metric.toUpperCase();

                if (missionId) {
                    const { error: err } = await supabase.from('community_goal_templates').update(payload).eq('id', missionId);
                    error = err;
                } else {
                    const { error: err } = await supabase.from('community_goal_templates').insert(payload);
                    error = err;
                }
            }

            if (error) throw error;

            alert(`Mission ${missionId ? 'Updated' : 'Launched'} Successfully! 🚀`);
            onSave();
        } catch (err) {
            console.error("Submission Error:", err);
            alert("Failed to save mission: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

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
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    border: '1px solid #333',
                    color: '#fff',
                    fontFamily: 'Inter'
                }}
            >
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>
                        {missionId ? 'EDIT' : 'NEW'} <span style={{ color: '#FFC800' }}>MISSION</span>
                    </h2>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </header>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Scope Toggle - Locked if Editing */}
                    {!missionId && (
                        <div style={{ display: 'flex', gap: '16px' }}>
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
                            style={{ padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '1rem' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>Briefing (Description)</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief instructions for the operative..."
                            style={{ padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff', minHeight: '80px', fontFamily: 'Inter' }}
                        />
                    </div>

                    {/* Translations Trigger */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(255, 200, 0, 0.05)', border: '1px solid rgba(255, 200, 0, 0.2)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <label style={{ color: '#FFC800', fontSize: '0.9rem', fontWeight: 'bold' }}>Translations</label>
                            <button
                                type="button"
                                onClick={handleAutoTranslate}
                                disabled={translating || !formData.title || !formData.description}
                                style={{
                                    padding: '8px 16px',
                                    background: translating ? '#555' : '#FFC800',
                                    color: translating ? '#888' : '#000',
                                    fontWeight: 'bold',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: translating ? 'default' : 'pointer'
                                }}
                            >
                                {translating ? 'Translating...' : 'Auto-Translate (DeepL)'}
                            </button>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>
                            Generated: {Object.keys(formData.translations || {}).length > 0 ? Object.keys(formData.translations).join(', ').toUpperCase() : 'None yet.'}
                        </div>
                    </div>

                    {/* Config Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {scope === 'SOLO' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>Duration Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    style={{ padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
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
                                style={{ padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
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
                                style={{ padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>XP Reward</label>
                            <input
                                type="number"
                                value={formData.xp_reward}
                                onChange={e => setFormData({ ...formData, xp_reward: parseInt(e.target.value) || 0 })}
                                style={{ padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                            />
                        </div>
                    </div>

                    {/* Focus Tags */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>Target Focus (Algorithm Logic)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                                            border: isSelected ? '1px solid #FFC800' : '1px solid #333',
                                            background: isSelected ? 'rgba(255, 200, 0, 0.1)' : '#000',
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

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button 
                            type="button"
                            onClick={onClose}
                            style={{ flex: 1, padding: '16px', background: '#333', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 2,
                                padding: '16px',
                                background: loading ? '#555' : (scope === 'SOLO' ? '#FFC800' : '#00A3FF'),
                                color: loading ? '#888' : '#000',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Processing...' : (missionId ? 'UPDATE MISSION 💾' : 'LAUNCH MISSION 🚀')}
                        </button>
                    </div>

                </form>
            </motion.div>
        </div>
    );
}
