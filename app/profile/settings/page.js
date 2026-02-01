"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';

import GoalWizard from '@/components/GoalWizard';

export default function SettingsPage() {
    const { user, updateUserProfile } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [showGoalWizard, setShowGoalWizard] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    // Form States
    const [name, setName] = useState(user?.user_metadata?.name || user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [newPassword, setNewPassword] = useState('');

    // Preferences
    const [smartSuggestions, setSmartSuggestions] = useState(user?.user_metadata?.preferences?.smart_suggestions ?? true);
    const [workoutGoal, setWorkoutGoal] = useState(user?.workout_goal || 150);

    // Safety check - MUST be after hooks
    if (!user) return <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Loading...</div>;


    const handleUpdateProfile = async () => {
        setIsLoading(true);
        setMessage(null);
        setError(null);

        try {
            // Update Supabase Auth for Email/Password
            const updates = {};
            if (email !== user.email) updates.email = email;
            if (newPassword) updates.password = newPassword;

            // Handle Metadata Updates (Name & Preferences)
            const currentMeta = user.user_metadata || {};
            const newMeta = { ...currentMeta };
            let metaChanged = false;

            if (name !== (currentMeta.name || user.name)) {
                newMeta.name = name;
                metaChanged = true;
            }

            const currentPrefs = currentMeta.preferences || {};
            if (smartSuggestions !== (currentPrefs.smart_suggestions ?? true)) {
                newMeta.preferences = { ...currentPrefs, smart_suggestions: smartSuggestions };
                metaChanged = true;
            }

            if (metaChanged) {
                updates.data = newMeta;
            }

            // 1. Auth Update
            if (Object.keys(updates).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(updates);
                if (authError) throw authError;
            }

            // 2. Profile Column Update (workout_goal)
            if (workoutGoal !== user.workout_goal) {
                const { error: profileError } = await supabase.from('profiles').update({ workout_goal: workoutGoal }).eq('id', user.id);
                if (profileError) throw profileError;
            }

            // Update Local Store & Supabase DB (if using one for profile data, currently mocking in store)
            // We pass the updated metadata to the store to reflect changes immediately
            // Also update the workout_goal in local user object if possible, or just re-fetch
            updateUserProfile({
                name,
                email,
                workout_goal: workoutGoal,
                user_metadata: updates.data ? { ...user.user_metadata, ...updates.data } : user.user_metadata
            });

            setMessage('Profile updated successfully!');
            setNewPassword(''); // Clear password field for security
        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/profile" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>Account Settings</h1>
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

                {error && (
                    <div style={{
                        background: 'rgba(255, 23, 68, 0.1)',
                        border: '1px solid var(--error)',
                        color: 'var(--error)',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '24px'
                    }}>
                        {error}
                    </div>
                )}

                <section style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-muted)' }}>Security</h3>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-main)'
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>New Password</label>
                        <input
                            type="password"
                            placeholder="Leave blank to keep current"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-main)'
                            }}
                        />
                    </div>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-muted)' }}>Training Preferences</h3>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)'
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
                        <style jsx>{`
                            .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
                            .switch input { opacity: 0; width: 0; height: 0; }
                            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--surface-highlight); transition: .4s; border-radius: 34px; }
                            .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
                            input:checked + .slider { background-color: var(--primary); }
                            input:checked + .slider:before { transform: translateX(24px); }
                        `}</style>
                    </div>

                    <div style={{ marginTop: '16px' }}>
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
                                    color: 'var(--text-main)'
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

                <section style={{ marginBottom: '32px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-muted)' }}>Data Synchronization</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        If you are seeing incorrect or old data (like "Test Workouts"), try syncing or fixing legacy data.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <DebugDataTools />
                    </div>
                </section>

                <section style={{ marginBottom: '32px', borderTop: '1px solid var(--error)', paddingTop: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--error)' }}>Danger Zone</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Deleting your account will remove all workout history and data. This action cannot be undone.
                    </p>
                    <button
                        onClick={async () => {
                            if (confirm('Are you ABSOLUTELY sure? This will delete all your workouts and data permanently.')) {
                                if (confirm('Last chance. This action cannot be undone.')) {
                                    setIsLoading(true);
                                    setStatus('Deleting Account...'); // reuse status logic if possible or just use overlay

                                    try {
                                        // 1. Delete associated data
                                        await supabase.from('workouts').delete().eq('user_id', user.id);
                                        await supabase.from('workout_templates').delete().eq('user_id', user.id);
                                        await supabase.from('custom_exercises').delete().eq('user_id', user.id);
                                        await supabase.from('notifications').delete().eq('user_id', user.id);
                                        // Delete friendships
                                        await supabase.from('friendships').delete().or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

                                        // 2. Scrub Profile (retain ID for FKs in chats, but anonymize)
                                        await supabase.from('profiles').update({
                                            name: 'Deleted Account',
                                            username: `deleted_${user.id.slice(0, 8)}`,
                                            avatar_url: null,
                                            bio: null,
                                            gym_id: null
                                        }).eq('id', user.id);

                                        // 3. Sign Out
                                        await supabase.auth.signOut();
                                        router.push('/login');
                                    } catch (err) {
                                        console.error("Account deletion failed:", err);
                                        setError('Account deletion failed: ' + err.message);
                                        setIsLoading(false);
                                    }
                                }
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'transparent',
                            color: 'var(--error)',
                            border: '1px solid var(--error)',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        Delete Account
                    </button>
                </section>

                <button
                    onClick={handleUpdateProfile}
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
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}

function DebugDataTools() {
    const { fetchTemplates, workoutTemplates, deleteWorkoutTemplate, user } = useStore();
    const [status, setStatus] = useState('');
    const supabase = createClient();

    const handleSync = async () => {
        setStatus('Syncing...');
        try {
            await fetchTemplates(); // Re-fetch
            setStatus('Sync Complete.');
        } catch (e) {
            setStatus('Sync Failed: ' + e.message);
        }
    };

    const handleFixLegacy = async () => {
        if (!confirm('This will purge "Test" templates (t1, t2) from your app view and database. Continue?')) return;
        setStatus('Fixing...');

        const testIds = ['t1', 't2'];
        let count = 0;

        for (const id of testIds) {
            try {
                // 1. Force Remove from Client Store (Optimistic / Local Cleanup)
                deleteWorkoutTemplate(id);

                // Check if ID is a valid UUID before hitting DB to avoid 22P02 error
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

                if (!isUUID) {
                    console.log(`Skipping DB delete for non-UUID id: ${id} (Local cleanup only)`);
                    count++;
                    continue; // Skip DB operations for invalid UUIDs
                }

                // 2. Cascade Delete Workouts (only if UUID)
                const { data: linked } = await supabase.from('workouts').select('id').eq('template_id', id);
                if (linked?.length > 0) {
                    const wIds = linked.map(w => w.id);
                    await supabase.from('workout_logs').delete().in('workout_id', wIds);
                    await supabase.from('workouts').delete().in('id', wIds);
                }

                // 3. Direct Supabase Delete
                const { error } = await supabase.from('workout_templates').delete().eq('id', id).eq('user_id', user.id);

                if (error) {
                    console.error(`Error deleting template ${id}:`, error.message);
                    throw error;
                }
                count++;
            } catch (err) {
                console.error(`Error processing ${id}:`, err);
                setStatus(`Error ${id}: ${err.message || 'Unknown error'}`);
            }
        }

        // Force refresh from DB (should be empty if they were ghosts)
        await fetchTemplates();
        setStatus(`Fix Complete. Ghost items purged.`);
    };

    return (
        <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                    onClick={handleSync}
                    style={{ flex: 1, padding: '8px', background: 'var(--surface-highlight)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
                >
                    🔄 Refresh Data
                </button>
                <button
                    onClick={handleFixLegacy}
                    style={{ flex: 1, padding: '8px', background: 'var(--surface-highlight)', border: '1px solid var(--warning)', color: 'var(--warning)', borderRadius: '4px', cursor: 'pointer' }}
                >
                    ⚠️ Fix Legacy Data
                </button>
            </div>
            {status && <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '8px' }}>{status}</div>}

            <details>
                <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Debug Info (Templates: {workoutTemplates.length})</summary>
                <pre style={{ marginTop: '8px', fontSize: '0.75rem', overflowX: 'auto', padding: '8px', background: 'var(--background)', borderRadius: '4px' }}>
                    {JSON.stringify(workoutTemplates.map(t => ({ id: t.id, name: t.name })), null, 2)}
                </pre>
            </details>
        </div>
    );
}
