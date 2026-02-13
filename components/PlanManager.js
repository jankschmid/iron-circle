"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import PlanBuilder from './PlanBuilder';
import { useTranslation } from '@/context/TranslationContext';

export default function PlanManager({ onClose }) {
    const { t } = useTranslation();
    const { workoutPlans, fetchPlans, activatePlan, deletePlan } = useStore();
    const [editingPlan, setEditingPlan] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm(t("Delete this plan?"))) {
            await deletePlan(id);
        }
    };

    if (isCreating || editingPlan) {
        return <PlanBuilder
            existingPlan={editingPlan}
            onClose={() => {
                setEditingPlan(null);
                setIsCreating(false);
                fetchPlans();
            }}
        />;
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--surface)', zIndex: 100, overflowY: 'auto', padding: '20px'
        }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 style={{ margin: 0 }}>{t('My Workout Plans')}</h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1rem' }}>{t('Close')}</button>
            </header>

            <button
                onClick={() => setIsCreating(true)}
                style={{
                    width: '100%',
                    padding: '20px',
                    background: 'var(--surface-highlight)',
                    border: '2px dashed var(--border)',
                    borderRadius: '12px',
                    color: 'var(--primary)',
                    fontWeight: 'bold',
                    marginBottom: '32px'
                }}
            >
                + {t('Create New Plan')}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {workoutPlans.map(plan => (
                    <motion.div
                        key={plan.id}
                        layout
                        style={{
                            background: 'var(--surface-highlight)',
                            borderRadius: '16px',
                            padding: '20px',
                            border: plan.is_active ? '2px solid var(--primary)' : '1px solid var(--border)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: plan.is_active ? 'var(--primary)' : 'white' }}>
                                    {plan.name} {plan.is_active && <span style={{ fontSize: '0.8rem', background: 'var(--primary)', color: 'black', padding: '2px 8px', borderRadius: '100px', marginLeft: '8px' }}>{t('Active')}</span>}
                                </h3>
                                {plan.description && <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{plan.description}</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingPlan(plan); }}
                                    style={{ background: 'var(--surface)', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem' }}
                                >
                                    {t('Edit')}
                                </button>
                                <button
                                    onClick={(e) => handleDelete(e, plan.id)}
                                    style={{ background: 'var(--surface)', color: 'var(--error)', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem' }}
                                >
                                    {t('Delete')}
                                </button>
                            </div>
                        </div>

                        {/* Plan Days Preview */}
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
                            {(plan.days || []).map(day => (
                                <div key={day.id} style={{
                                    flexShrink: 0,
                                    background: 'var(--surface)',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{t('Day')} {day.day_order}</div>
                                    <div>{day.label}</div>
                                </div>
                            ))}
                        </div>

                        {!plan.is_active && (
                            <button
                                onClick={() => activatePlan(plan.id)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'var(--primary)',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold'
                                }}
                            >
                                {t('Set as Active Plan')}
                            </button>
                        )}
                    </motion.div>
                ))}

                {workoutPlans.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                        {t('No plans yet. Create one like "Push Pull Legs" or "Bro Split".')}
                    </div>
                )}
            </div>
        </div>
    );
}
