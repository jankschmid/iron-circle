"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { Dumbbell, Activity, Heart, Trophy } from 'lucide-react';

export default function GoalSelectorModal() {
    const { user, setUser } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        // Trigger if user is loaded but has no goal set (NULL).
        // We rely purely on the DB state. 'Muscle' is now a valid choice, not a default "empty" state.
        if (user && !user.goal) {
            setIsOpen(true);
        }
    }, [user]);

    const handleConfirm = async () => {
        if (!selectedGoal || !user) return;
        setLoading(true);

        const { error } = await supabase
            .from('profiles')
            .update({ goal: selectedGoal })
            .eq('id', user.id);

        if (!error) {
            // Optimistic Update
            setUser(prev => ({ ...prev, goal: selectedGoal }));
            setIsOpen(false);
        } else {
            console.error(error);
            alert("Failed to save goal.");
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    const goals = [
        { id: 'Strength', icon: <Trophy size={24} />, label: 'Strength', desc: 'Focus on 1RM and Heavy Lifts' },
        { id: 'Muscle', icon: <Dumbbell size={24} />, label: 'Hypertrophy', desc: 'Build Muscle Mass (8-12 Reps)' },
        { id: 'Endurance', icon: <Heart size={24} />, label: 'Endurance', desc: 'Cardio & High Reps' },
        { id: 'balanced', icon: <Activity size={24} />, label: 'Balanced', desc: 'Mix of everything' }
    ];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                padding: '24px',
                width: '100%', maxWidth: '400px',
                border: '1px solid var(--border)',
                textAlign: 'center'
            }}>
                <h2 style={{ marginBottom: '8px' }}>🎯 Choose Your Focus</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                    To give you the best <strong>Smart Coaching</strong> suggestions, we need to know your primary training goal.
                </p>

                <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                    {goals.map(g => (
                        <button
                            key={g.id}
                            onClick={() => setSelectedGoal(g.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '16px',
                                padding: '16px',
                                background: selectedGoal === g.id ? 'var(--surface-highlight)' : 'transparent',
                                border: selectedGoal === g.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ color: selectedGoal === g.id ? 'var(--primary)' : 'var(--text-muted)' }}>{g.icon}</div>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{g.label}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{g.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleConfirm}
                    disabled={!selectedGoal || loading}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: selectedGoal ? 'var(--primary)' : 'var(--surface-highlight)',
                        color: selectedGoal ? '#000' : 'var(--text-muted)',
                        borderRadius: '100px',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        cursor: selectedGoal ? 'pointer' : 'not-allowed',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Saving...' : 'Set Goal & Start'}
                </button>
            </div>
        </div>
    );
}
