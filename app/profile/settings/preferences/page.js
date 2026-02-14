"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import GoalWizard from '@/components/GoalWizard';

export default function PreferencesSettingsPage() {
    const { user, updateUserProfile } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showGoalWizard, setShowGoalWizard] = useState(false);
    const supabase = createClient();

    // State
    const [smartSuggestions, setSmartSuggestions] = useState(user?.user_metadata?.preferences?.smart_suggestions ?? true);
    const [workoutGoal, setWorkoutGoal] = useState(user?.workout_goal || 150);

    if (!user) return <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Loading...</div>;

    const handleSave = async () => {
        setIsLoading(true);
        setMessage(null);
        try {
            const currentMeta = user.user_metadata || {};
            const currentPrefs = currentMeta.preferences || {};

            const newMeta = {
                ...currentMeta,
                preferences: { ...currentPrefs, smart_suggestions: smartSuggestions }
            };

            // 1. Update Auth Metadata
            const { error: authError } = await supabase.auth.updateUser({ data: newMeta });
            if (authError) throw authError;

            // 2. Update Column
            const { error: profileError } = await supabase.from('profiles').update({ workout_goal: workoutGoal }).eq('id', user.id);
            if (profileError) throw profileError;

            updateUserProfile({
                workout_goal: workoutGoal,
                user_metadata: newMeta
            });

            setMessage('Preferences saved!');
        } catch (e) {
            console.error(e);
            setMessage('Failed to save preferences.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/profile/settings" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>Preferences</h1>
            </header>

            <div style={{ maxWidth: '100%', margin: '0 auto' }}>
                {message && (
                    <div style={{
                        background: 'rgba(0, 230, 118, 0.1)',
                        border: '1px solid var(--success)',
                        color: 'var(--success)',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '24px'
                    }}>
                        {message}
                    </div>
                )}

                <section style={{ marginBottom: '32px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                        marginBottom: '24px'
                    }}>
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Smart Suggestions 🧠</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Algorithmic recommendations for weight & reps based on your history.
                            </div>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={smartSuggestions}
                                onChange={(e) => setSmartSuggestions(e.target.checked)}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Annual Workout Goal 🎯</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="number"
                                value={workoutGoal}
                                onChange={(e) => setWorkoutGoal(parseInt(e.target.value) || 0)}
                                placeholder="e.g. 150"
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-main)',
                                    fontSize: '1rem'
                                }}
                            />
                            <button
                                onClick={() => setShowGoalWizard(true)}
                                style={{
                                    padding: '0 20px',
                                    background: 'var(--surface-highlight)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--primary)',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                🪄 Assist
                            </button>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Target number of workouts for the year. Used in your profile graph.
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--primary)',
                            color: '#000',
                            fontWeight: '700',
                            fontSize: '1rem',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            opacity: isLoading ? 0.7 : 1,
                            cursor: isLoading ? 'wait' : 'pointer'
                        }}
                    >
                        {isLoading ? 'Saving...' : 'Save Preferences'}
                    </button>
                </section>

                {showGoalWizard && (
                    <GoalWizard
                        currentGoal={workoutGoal}
                        onClose={() => setShowGoalWizard(false)}
                        onSave={(val) => {
                            setWorkoutGoal(val);
                            setShowGoalWizard(false);
                        }}
                    />
                )}

                {/* Training Goal Selector */}
                <section style={{ marginBottom: '32px' }}>
                    <div style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Training Style 🏋️‍♂️</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Affects your XP gains! (e.g. Endurance = more XP for cardio).
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {['Muscle', 'Strength', 'Endurance', 'Weight Loss'].map(g => (
                                <button
                                    key={g}
                                    onClick={async () => {
                                        // Optimistic Update
                                        updateUserProfile({ goal: g });
                                        // Persist
                                        const { error } = await supabase.from('profiles').update({ goal: g }).eq('id', user.id);
                                        if (error) {
                                            console.error("Failed to update goal:", error);
                                            alert("Failed to save goal");
                                        } else {
                                            // Make sure store updates (fetchProfile might be needed if not using real-time)
                                            // The updateUserProfile above handles local state
                                        }
                                    }}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: (user.goal === g) ? 'var(--primary)' : 'var(--background)',
                                        color: (user.goal === g) ? '#000' : 'var(--text-muted)',
                                        fontWeight: (user.goal === g) ? 'bold' : 'normal',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Auto Tracking Toggle */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                    marginTop: '24px'
                }}>
                    <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Auto Tracking 📍</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Automatically start gym sessions when you arrive at a gym.
                        </div>
                    </div>
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={user?.auto_tracking_enabled || false}
                            onChange={async (e) => {
                                // Optimistic
                                updateUserProfile({ auto_tracking_enabled: e.target.checked });

                                const { error } = await supabase
                                    .from('profiles')
                                    .update({ auto_tracking_enabled: e.target.checked })
                                    .eq('id', user.id);

                                if (error) {
                                    console.error("Failed to update auto-tracking:", error);
                                    updateUserProfile({ auto_tracking_enabled: !e.target.checked }); // Revert
                                }
                            }}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>

                <style jsx>{`
                    .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
                    .switch input { opacity: 0; width: 0; height: 0; }
                    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--surface-highlight); transition: .4s; border-radius: 34px; }
                    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
                    input:checked + .slider { background-color: var(--primary); }
                    input:checked + .slider:before { transform: translateX(24px); }
                `}</style>
            </div>
        </div>
    );
}
