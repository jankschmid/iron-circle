"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';

export default function EditProfilePage() {
    const { user, updateUserProfile, GYMS } = useStore();
    const router = useRouter();
    const supabase = createClient();

    const [name, setName] = useState(user?.name || '');
    // Strip empty handle defaults or existing @
    const [handle, setHandle] = useState(user?.handle ? user.handle.replace(/^@/, '') : '');
    const [bio, setBio] = useState(user?.bio || '');
    const [gymId, setGymId] = useState(user?.gymId || '');
    const [gymName, setGymName] = useState(user?.gymName || '');

    // Gym Search State
    const [gymSearch, setGymSearch] = useState(user?.gymName || '');
    const [gymResults, setGymResults] = useState([]);
    const [showResults, setShowResults] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Handlers
    const handleGymSearch = async (e) => {
        const query = e.target.value;
        setGymSearch(query);
        setShowResults(true);

        if (query.length > 2) {
            const { searchPlaces } = await import('@/lib/places');
            const results = await searchPlaces(query);
            setGymResults(results);
        } else {
            setGymResults([]);
        }
    };

    const selectGym = (gym) => {
        setGymId(gym.id);
        setGymName(gym.name);
        setGymSearch(gym.name);
        setShowResults(false);
    };

    if (!user) return <div className="container" style={{ paddingTop: '40px' }}>Loading...</div>;

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Validation
            const cleanHandle = handle.trim();
            if (cleanHandle && (cleanHandle.length < 3 || cleanHandle.length > 15)) throw new Error("Handle must be 3-15 chars");
            if (cleanHandle && !/^[a-zA-Z0-9]+$/.test(cleanHandle)) throw new Error("Handle must be alphanumeric (no symbols)");

            // Check if changes were made
            const currentHandle = user.handle ? user.handle.replace(/^@/, '') : '';
            const hasChanges =
                name !== (user.name || '') ||
                cleanHandle !== currentHandle ||
                bio !== (user.bio || '') ||
                gymId !== (user.gymId || '');

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
                    gym_id: gymId || null,
                    gym_name: gymName || null,
                    updated_at: new Date()
                })
                .eq('id', user.id);

            if (updateError) throw new Error("Update failed: " + updateError.message);

            // Update Local State safely
            try {
                updateUserProfile({ name, handle: '@' + cleanHandle, bio, gymId: gymId || null, gymName: gymName || null });
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

                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Home Gym</label>
                    {gymId ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px',
                            background: 'var(--surface-highlight)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--primary)'
                        }}>
                            <div style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                {gymSearch || 'Selected Gym'}
                            </div>
                            <button
                                onClick={() => { setGymId(''); setGymSearch(''); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <div>
                            <input
                                value={gymSearch}
                                onChange={handleGymSearch}
                                onFocus={() => setShowResults(true)}
                                placeholder="Search for your gym..."
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--foreground)'
                                }}
                            />
                            {showResults && gymResults.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    marginTop: '4px',
                                    zIndex: 10,
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}>
                                    {gymResults.map(gym => (
                                        <div
                                            key={gym.id}
                                            onClick={() => selectGym(gym)}
                                            style={{
                                                padding: '12px 16px',
                                                borderBottom: '1px solid var(--border)',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = 'var(--surface-highlight)'}
                                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                        >
                                            <div style={{ fontWeight: '600' }}>{gym.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{gym.location}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
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
