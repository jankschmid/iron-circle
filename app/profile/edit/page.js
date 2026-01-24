"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';

export default function EditProfilePage() {
    const { user, updateUserProfile, fetchGyms } = useStore();
    const router = useRouter();
    const supabase = createClient();

    const [name, setName] = useState(user?.name || '');
    const [handle, setHandle] = useState(user?.handle ? user.handle.replace(/^@/, '') : '');
    const [bio, setBio] = useState(user?.bio || '');
    const [autoTracking, setAutoTracking] = useState(user?.auto_tracking_enabled || false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Handlers


    if (!user) return <div className="container" style={{ paddingTop: '40px' }}>Loading...</div>;

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Validation
            const cleanHandle = handle.trim().replace(/^@+/, '');

            if (cleanHandle && (cleanHandle.length < 3 || cleanHandle.length > 15)) throw new Error("Handle must be 3-15 chars");
            if (cleanHandle && !/^[a-zA-Z0-9]+$/.test(cleanHandle)) throw new Error("Handle must be alphanumeric (no symbols)");

            // Check if changes were made
            const currentHandle = user.handle ? user.handle.replace(/^@/, '') : '';
            const hasChanges =
                name !== (user.name || '') ||
                cleanHandle !== currentHandle ||
                bio !== (user.bio || '') ||
                autoTracking !== (user.auto_tracking_enabled || false);

            if (!hasChanges) {
                router.push('/profile');
                return;
            }

            // Check uniqueness if handle changed
            if (cleanHandle && cleanHandle !== currentHandle) {
                const { data: existing, error: checkError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', cleanHandle)
                    .neq('id', user.id)
                    .maybeSingle();

                if (checkError) throw new Error("Failed to check username availability: " + checkError.message);
                if (existing) throw new Error("Username is already taken");
            }

            // Update Database
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    name: name,
                    username: cleanHandle,
                    bio: bio,
                    // gym_id: gymId || null, // Removed legacy field update
                    auto_tracking_enabled: autoTracking,
                    updated_at: new Date()
                })
                .eq('id', user.id);

            if (updateError) throw new Error("Update failed: " + updateError.message);

            // Update Local State safely
            try {
                updateUserProfile({
                    name,
                    handle: '@' + cleanHandle,
                    bio,
                    // gymId: gymId || null, 
                    // gymName: gymName || null,
                    auto_tracking_enabled: autoTracking
                });
            } catch (localErr) {
                console.error(localErr);
            }

            // Success - Navigation
            router.push('/profile');

        } catch (e) {
            console.error("Save error:", e);
            setError(e.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/profile" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>Edit Profile</h1>
            </header>

            {error && (
                <div style={{ background: 'rgba(255, 23, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gap: '24px' }}>
                {/* Avatar Placeholder */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                    <img
                        src={user.avatar}
                        style={{
                            width: '96px',
                            height: '96px',
                            borderRadius: '50%',
                            border: '3px solid var(--primary)',
                            objectFit: 'cover',
                            marginBottom: '16px'
                        }}
                    />
                    <button style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '600' }}>Change Photo</button>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Display Name</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--foreground)'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Handle / Tag</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>@</span>
                        <input
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            placeholder="username"
                            style={{
                                width: '100%',
                                padding: '16px',
                                paddingLeft: '40px',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--foreground)'
                            }}
                        />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        3-15 alphanumeric characters.
                    </p>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Auto-Tracking</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <input
                            type="checkbox"
                            id="autoTrack"
                            checked={autoTracking}
                            onChange={e => setAutoTracking(e.target.checked)}
                            style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                        />
                        <label htmlFor="autoTrack" style={{ color: 'var(--text-main)', fontSize: '1rem', cursor: 'pointer' }}>
                            Enable Background Tracking
                        </label>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Requires GPS permissions. Automatically tracks sessions when you enter your saved gyms.
                    </p>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Bio</label>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about your fitness journey..."
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--foreground)',
                            resize: 'none',
                            fontFamily: 'inherit'
                        }}
                    />
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
                        fontSize: '1.1rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '16px',
                        opacity: isLoading ? 0.7 : 1,
                        cursor: isLoading ? 'wait' : 'pointer'
                    }}
                >
                    {isLoading ? 'Saving...' : 'Save Profile'}
                </button>
            </div>
        </div>
    );
}
