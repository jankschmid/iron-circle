"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';

export default function ProfileSetupPage() {
    const { user, updateUserProfile } = useStore();
    const router = useRouter();
    const supabase = createClient();

    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [checking, setChecking] = useState(false);

    // Initial check - if already has username, go home
    useEffect(() => {
        if (user?.handle) {
            router.push('/');
        }
    }, [user, router]);

    const validateUsername = (val) => {
        if (val.length < 3) return "Too short (min 3 chars)";
        if (val.length > 15) return "Too long (max 15 chars)";
        if (!/^[a-zA-Z0-9]+$/.test(val)) return "Letters and numbers only (no symbols)";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const valError = validateUsername(username);
        if (valError) {
            setError(valError);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 0. Get User ID first
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData?.session?.user?.id;

            if (!userId) throw new Error("No authenticated session found");

            // 1. Check availability
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .single();

            if (existing && existing.id !== userId) {
                setError("Username already taken");
                setLoading(false);
                return;
            }

            // 2. Create/Update Profile

            const { error: insertError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    username: username,
                    name: username, // Default name to username initially
                    updated_at: new Date()
                });

            if (insertError) throw insertError;

            // 3. Update Sync & Redirect
            // Force reload user in store (or manually update)
            updateUserProfile({ handle: '@' + username, name: username });

            window.location.href = '/'; // Hard refresh to ensure state is clean
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to set username");
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', padding: '32px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
                <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '8px', textAlign: 'center' }}>Choose Identity</h1>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '32px' }}>Pick a unique username to start.</p>

                {error && (
                    <div style={{ background: 'rgba(255, 23, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '500' }}>Username</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>@</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value.trim()); // No spaces
                                    setError(null);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    paddingLeft: '40px',
                                    background: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-main)',
                                    fontSize: '1rem' // prevent zoom on mobile
                                }}
                                placeholder="ironwolf"
                                required
                            />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            3-15 characters, letters & numbers only.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--primary)',
                            color: '#000',
                            fontWeight: '700',
                            fontSize: '1rem',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'wait' : 'pointer'
                        }}
                    >
                        {loading ? 'Claiming...' : 'Get Started'}
                    </button>
                </form>


                <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>
                        Already have an account?
                    </p>
                    <button
                        onClick={async () => {
                            const { error } = await supabase.auth.signOut();
                            if (error) console.error(error);
                            window.location.href = '/login';
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Log in here
                    </button>
                </div>
            </div>
        </div >
    );
}
