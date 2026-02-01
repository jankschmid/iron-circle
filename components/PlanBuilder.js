"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';

export default function PlanBuilder({ existingPlan, onClose }) {
    const { templates, fetchTemplates, savePlan, addWorkoutTemplate } = useStore();
    const [name, setName] = useState(existingPlan?.name || '');
    const [description, setDescription] = useState(existingPlan?.description || '');
    const [days, setDays] = useState(existingPlan?.days || [{ id: 'temp-1', day_order: 1, template_id: null, label: 'Day 1' }]);
    const [loading, setLoading] = useState(false);
    const [creatingTemplateForIndex, setCreatingTemplateForIndex] = useState(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const addDay = () => {
        const nextOrder = days.length + 1;
        // Default new day to Rest Day label
        setDays([...days, { id: `temp-${Date.now()}`, day_order: nextOrder, template_id: null, label: 'Rest Day' }]);
    };

    const removeDay = (index) => {
        const newDays = days.filter((_, i) => i !== index).map((d, i) => ({
            ...d,
            day_order: i + 1,
        }));
        setDays(newDays);
    };

    const updateDay = (index, field, value) => {
        const newDays = [...days];
        newDays[index] = { ...newDays[index], [field]: value };

        // If updating template_id, automatically update the label to match the template name
        if (field === 'template_id') {
            if (value) {
                const template = templates.find(t => t.id === value);
                if (template) {
                    newDays[index].label = template.name;
                }
            } else {
                newDays[index].label = 'Rest Day';
            }
        }

        setDays(newDays);
    };

    const quickCreateTemplate = async (index) => {
        const defaultName = `Day ${days[index].day_order} Workout`;
        if (!confirm(`Create a new empty template named "${defaultName}"?`)) return;

        try {
            const newId = await addWorkoutTemplate({
                name: defaultName,
                exercises: [],
                visibility: 'private'
            });

            if (newId) {
                await fetchTemplates(); // Refresh list

                // We need to fetch specific template to get name, or just use defaultName
                // updateDay handles label update if we pass ID, but we need template in store first.
                // Simpler: manually update both
                const newDays = [...days];
                newDays[index] = {
                    ...newDays[index],
                    template_id: newId,
                    label: defaultName
                };
                setDays(newDays);
            }
        } catch (e) {
            alert("Error creating template: " + e.message);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return alert("Please name your plan.");
        setLoading(true);
        try {
            await savePlan({ id: existingPlan?.id, name, description }, days);
            onClose();
        } catch (e) {
            alert("Failed to save plan: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: '100dvh', // Dynamic viewport height for mobile
            background: 'var(--surface)',
            zIndex: 200, // Higher than everything
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* 1. Fixed Header */}
            <div style={{ flex: '0 0 auto', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{existingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1rem', padding: '8px' }}>Close</button>
                </header>
            </div>

            {/* 2. Scrollable Content */}
            <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '20px', paddingBottom: '100px' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {/* Meta Inputs */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Plan Name</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Push Pull Legs"
                            style={{ width: '100%', padding: '16px', background: 'var(--surface-highlight)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '1.1rem', fontWeight: 'bold' }}
                        />
                    </div>
                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Goal of this plan..."
                            style={{ width: '100%', padding: '16px', background: 'var(--surface-highlight)', border: 'none', borderRadius: '8px', color: 'white', minHeight: '80px', fontFamily: 'inherit' }}
                        />
                    </div>

                    {/* Days Builder */}
                    <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Schedule</h3>

                    {days.length === 0 && (
                        <div style={{
                            padding: '24px',
                            background: 'var(--surface-highlight)',
                            borderRadius: '16px',
                            border: '2px dashed var(--border)',
                            marginBottom: '24px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>♾️</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px' }}>Flex Plan</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                No fixed schedule. Workouts are added dynamically.
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <AnimatePresence>
                            {days.map((day, index) => (
                                <motion.div
                                    key={day.id || index}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{
                                        background: 'var(--surface-highlight)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        border: '1px solid var(--border)'
                                    }}
                                >
                                    {/* Header Row: Label + Remove */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px' }}>
                                                Day {day.day_order}
                                            </span>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: day.template_id ? 'white' : 'var(--text-muted)' }}>
                                                {day.template_id ?
                                                    (templates.find(t => t.id === day.template_id)?.name || 'Loading...')
                                                    : 'Rest Day 💤'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeDay(index)}
                                            style={{ color: 'var(--error)', background: 'none', border: 'none', fontSize: '1.2rem', padding: '0 8px' }}
                                        >
                                            ×
                                        </button>
                                    </div>

                                    {/* Template Selection Row */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select
                                            value={day.template_id || ''}
                                            onChange={e => updateDay(index, 'template_id', e.target.value || null)}
                                            style={{
                                                flex: 1,
                                                padding: '12px',
                                                background: 'var(--surface)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '0.95rem'
                                            }}
                                        >
                                            <option value="">Rest Day 💤</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>

                                        {!day.template_id && (
                                            <button
                                                onClick={() => quickCreateTemplate(index)}
                                                title="Create new template"
                                                style={{
                                                    padding: '0 16px',
                                                    background: 'var(--surface)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '8px',
                                                    color: 'var(--primary)',
                                                    fontWeight: 'bold',
                                                    fontSize: '1.2rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                +
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                        {day.template_id ? "Linked to template" : "Select a template or click + to create one."}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <button
                        onClick={addDay}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'transparent',
                            border: '2px dashed var(--border)',
                            borderRadius: '12px',
                            color: 'var(--text-muted)',
                            marginTop: '20px',
                            marginBottom: '20px',
                            cursor: 'pointer'
                        }}
                    >
                        + Add Day
                    </button>
                </div>
            </div>

            {/* 3. Fixed Footer */}
            <div style={{ flex: '0 0 auto', padding: '20px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    style={{
                        width: '100%',
                        maxWidth: '600px',
                        margin: '0 auto',
                        display: 'block',
                        padding: '16px',
                        background: 'var(--primary)',
                        color: 'black',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Saving...' : 'Save Plan'}
                </button>
            </div>
        </div>
    );
}
