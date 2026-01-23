"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const { user, updateUserProfile, GYMS } = useStore();
    const router = useRouter();

    const [form, setForm] = useState({
        name: user.name,
        handle: user.handle || '',
        bio: user.bio || '',
        avatar: user.avatar,
        gymId: user.gymId || GYMS[0].id
    });

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = () => {
        updateUserProfile(form);
        router.back();
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/profile" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>Edit Profile</h1>
            </header>

            <section style={{ display: 'grid', gap: '24px' }}>
                {/* Avatar Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <img
                        src={form.avatar}
                        style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                    />
                    <div style={{ width: '100%' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Avatar URL</label>
                        <input
                            name="avatar"
                            value={form.avatar}
                            onChange={handleChange}
                            style={inputStyle}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Display Name</label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        style={inputStyle}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Handle</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }}>@</span>
                        <input
                            name="handle"
                            value={form.handle}
                            onChange={handleChange}
                            style={{ ...inputStyle, paddingLeft: '32px' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Bio</label>
                    <textarea
                        name="bio"
                        value={form.bio}
                        onChange={handleChange}
                        rows={3}
                        style={{ ...inputStyle, resize: 'none' }}
                        placeholder="Tell us about your fitness journey..."
                    />
                </div>

                {/* Units Toggle */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Units</label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button
                            onClick={() => updateUserProfile({ units: 'kg' })}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: user.units === 'kg' ? 'var(--primary)' : 'var(--surface)',
                                color: user.units === 'kg' ? '#000' : 'var(--text-muted)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: '600'
                            }}
                        >
                            Metric (kg)
                        </button>
                        <button
                            onClick={() => updateUserProfile({ units: 'lbs' })}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: user.units === 'lbs' ? 'var(--primary)' : 'var(--surface)',
                                color: user.units === 'lbs' ? '#000' : 'var(--text-muted)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: '600'
                            }}
                        >
                            Imperial (lbs)
                        </button>
                    </div>
                </div>

                {/* Gym Selection */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gym</label>
                    <select
                        name="gymId"
                        value={form.gymId}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--foreground)',
                            fontSize: '1rem'
                        }}
                    >
                        {GYMS.map(gym => (
                            <option key={gym.id} value={gym.id}>{gym.name} ({gym.location})</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <button
                        onClick={handleSave}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--primary)',
                            color: '#000',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: '700',
                            fontSize: '1.1rem'
                        }}
                    >
                        Save Changes
                    </button>
                    <button
                        onClick={() => router.back()}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            marginTop: '12px'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </section>
        </div>
    );
}

const inputStyle = {
    width: '100%',
    padding: '16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--foreground)',
    fontSize: '1rem',
    fontFamily: 'inherit'
};
