"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import HoldButton from '@/components/HoldButton';

export default function AccountSettingsPage() {
    const { user, updateUserProfile } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const router = useRouter();
    const supabase = createClient();

    // Form States
    const [email, setEmail] = useState(user?.email || '');
    const [newPassword, setNewPassword] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Safety check
    if (!user) return <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Loading...</div>;

    const handleUpdateAccount = async () => {
        setIsLoading(true);
        setMessage(null);
        setError(null);

        try {
            const updates = {};
            if (email !== user.email) updates.email = email;
            if (newPassword) updates.password = newPassword;

            if (Object.keys(updates).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(updates);
                if (authError) throw authError;

                // Update local store email if changed
                if (updates.email) {
                    updateUserProfile({ email: updates.email });
                }

                setMessage('Account updated successfully!');
                setNewPassword('');
            } else {
                setMessage('No changes to save.');
            }
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
                <Link href="/profile/settings" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>Account & Security</h1>
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
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-muted)' }}>Credentials</h3>
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

                    <button
                        onClick={handleUpdateAccount}
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
                            cursor: isLoading ? 'wait' : 'pointer',
                            marginTop: '16px'
                        }}
                    >
                        {isLoading ? 'Saving...' : 'Update Credentials'}
                    </button>
                </section>

                <section style={{ marginBottom: '32px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-muted)' }}>Data Synchronization</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        If you are seeing incorrect or old data (like "Test Workouts"), try syncing or fixing legacy data.
                    </p>
                    <DebugDataTools />
                </section>

                <section style={{ marginBottom: '32px', borderTop: '1px solid var(--error)', paddingTop: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--error)' }}>Danger Zone</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Deleting your account will remove all workout history and data. This action cannot be undone.
                    </p>
                    <button
                        onClick={() => setShowDeleteModal(true)}
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

                {/* DELETE MODAL */}
                {showDeleteModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <div style={{
                            background: 'var(--surface)', padding: '24px', borderRadius: '16px',
                            maxWidth: '400px', width: '100%', border: '1px solid var(--error)',
                            boxShadow: '0 0 50px rgba(255, 0, 0, 0.2)'
                        }}>
                            <h2 style={{ color: 'var(--error)', marginTop: 0 }}>Delete Account?</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                                This will <b>permanently delete</b> all your workouts, history, and friendships.
                                <br /><br />
                                There is no going back.
                            </p>

                            <HoldButton
                                color="#ff0000"
                                duration={3000}
                                label="Hold to Delete Forever"
                                onConfirm={async () => {
                                    setIsLoading(true);
                                    try {
                                        await supabase.from('workouts').delete().eq('user_id', user.id);
                                        await supabase.from('workout_templates').delete().eq('user_id', user.id);
                                        await supabase.from('custom_exercises').delete().eq('user_id', user.id);
                                        await supabase.from('notifications').delete().eq('user_id', user.id);
                                        await supabase.from('friendships').delete().or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

                                        const { error: rpcError } = await supabase.rpc('delete_own_user');
                                        if (rpcError) throw rpcError;

                                        await supabase.auth.signOut();
                                        localStorage.clear();
                                        router.push('/login');
                                    } catch (err) {
                                        console.error("Account deletion failed:", err);
                                        setError('Deletion failed: ' + err.message);
                                        setIsLoading(false);
                                        setShowDeleteModal(false);
                                    }
                                }}
                            />

                            <button
                                onClick={() => setShowDeleteModal(false)}
                                style={{
                                    marginTop: '16px', width: '100%', padding: '16px',
                                    background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
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
            await fetchTemplates();
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
                deleteWorkoutTemplate(id);
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

                if (!isUUID) {
                    console.log(`Skipping DB delete for non-UUID id: ${id}`);
                    count++;
                    continue;
                }

                const { data: linked } = await supabase.from('workouts').select('id').eq('template_id', id);
                if (linked?.length > 0) {
                    const wIds = linked.map(w => w.id);
                    await supabase.from('workout_logs').delete().in('workout_id', wIds);
                    await supabase.from('workouts').delete().in('id', wIds);
                }

                const { error } = await supabase.from('workout_templates').delete().eq('id', id).eq('user_id', user.id);
                if (error) throw error;
                count++;
            } catch (err) {
                console.error(`Error processing ${id}:`, err);
                setStatus(`Error: ${err.message}`);
            }
        }
        await fetchTemplates();
        setStatus(`Fix Complete.`);
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
        </div>
    );
}
