"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import AvatarEditor from '@/components/AvatarEditor';
import { useTranslation } from '@/context/TranslationContext';

export default function ProfileStatsPage() {
    const { t } = useTranslation();
    const { user, updateProfileData } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showAvatarEditor, setShowAvatarEditor] = useState(false);

    // Local State
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        height: '',
        weight: '',
        gender: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                name: user.name || user.user_metadata?.name || '',
                height: user.height || '',
                weight: user.weight || '',
                gender: user.gender || 'prefer_not_to_say'
            });
        }
    }, [user]);

    if (!user) return <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>{t('Loading...')}</div>;

    const handleSave = async () => {
        setIsLoading(true);
        setMessage(null);
        try {
            await updateProfileData({
                username: formData.username,
                name: formData.name,
                height: parseFloat(formData.height) || null,
                weight: parseFloat(formData.weight) || null,
                gender: formData.gender
            });
            setMessage(t('Profile updated successfully!'));
        } catch (e) {
            console.error(e);
            setMessage(t('Failed to update profile.'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/profile/settings" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>{t('My Profile')}</h1>
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

                {/* AVATAR SECTION */}
                <section style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <img
                            src={user.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`}
                            alt="Avatar"
                            style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--surface-highlight)' }}
                        />
                        <button
                            onClick={() => setShowAvatarEditor(true)}
                            style={{
                                position: 'absolute', bottom: 0, right: 0,
                                background: 'var(--primary)', color: '#000',
                                border: 'none', borderRadius: '50%',
                                width: '32px', height: '32px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            ✎
                        </button>
                    </div>
                </section>

                <section style={{ marginBottom: '32px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>{t('Username')}</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>@</span>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                                style={{ ...inputStyle, paddingLeft: '32px' }}
                                placeholder="username"
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>{t('Display Name')}</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>{t('Height (cm)')}</label>
                            <input
                                type="number"
                                value={formData.height}
                                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>{t('Weight (kg)')}</label>
                            <input
                                type="number"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Gender</label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            style={inputStyle}
                        >
                            <option value="prefer_not_to_say">{t('Prefer not to say')}</option>
                            <option value="male">{t('Male')}</option>
                            <option value="female">{t('Female')}</option>
                            <option value="other">{t('Other')}</option>
                        </select>
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
                            cursor: isLoading ? 'wait' : 'pointer',
                            marginTop: '16px'
                        }}
                    >
                        {isLoading ? t('Saving...') : t('Save Profile')}
                    </button>
                </section>

                {showAvatarEditor && (
                    <AvatarEditor
                        currentAvatar={user.avatar_url}
                        onSave={(newUrl) => {
                            updateProfileData({ avatar_url: newUrl });
                            setShowAvatarEditor(false);
                        }}
                        onClose={() => setShowAvatarEditor(false)}
                    />
                )}
            </div>
        </div>
    );
}

const inputStyle = {
    width: '100%',
    padding: '16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-main)',
    fontSize: '1rem'
};
