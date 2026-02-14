"use client";

import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import HardwareBackButton from '@/components/HardwareBackButton';
import { useTranslation } from '@/context/TranslationContext';

export default function PrivacySettingsPage() {
    const { user, updatePrivacySettings } = useStore();
    const router = useRouter();
    const { t } = useTranslation();
    const [settings, setSettings] = useState({
        profile_visibility: 'public',
        gym_monitor_streaming: true,
        live_status: true
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user?.privacy_settings) {
            setSettings({
                profile_visibility: user.privacy_settings.profile_visibility || 'public',
                gym_monitor_streaming: user.privacy_settings.gym_monitor_streaming !== false, // Default true
                live_status: user.privacy_settings.live_status !== false // Default true
            });
        }
    }, [user]);

    const handleToggle = async (key) => {
        // Optimistic update
        const newValue = !settings[key];
        setSettings(prev => ({ ...prev, [key]: newValue }));

        const success = await updatePrivacySettings({ [key]: newValue });
        if (!success) {
            // Revert on failure
            setSettings(prev => ({ ...prev, [key]: !newValue }));
        }
    };

    const handleSelect = async (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        await updatePrivacySettings({ [key]: value });
    };

    return (
        <div className="container" style={{ minHeight: '100vh', paddingBottom: '100px' }}>
            <HardwareBackButton />
            {/* Header */}
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/profile/settings" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>{t('Privacy & Data')}</h1>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* 1. Profile Visibility */}
                <section style={{ background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{t('Profile Visibility')}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('Control who can see your profile, stats, and workout history.')}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', background: 'var(--background)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                        {['public', 'friends', 'private'].map((option) => (
                            <button
                                key={option}
                                onClick={() => handleSelect('profile_visibility', option)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    background: settings.profile_visibility === option ? 'var(--primary)' : 'transparent',
                                    color: settings.profile_visibility === option ? '#000' : 'var(--text-muted)',
                                    fontWeight: settings.profile_visibility === option ? 'bold' : 'normal',
                                    textTransform: 'capitalize',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {option === 'friends' ? t('Friends Only') : t(option)}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 2. Gym Monitor Streaming */}
                <section style={{
                    background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ paddingRight: '16px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{t('Gym Monitor Streaming')}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {t('Allow your name and current exercise to appear on screens in')} <b>{t('Verified Partner Gyms')}</b>.
                        </p>
                    </div>
                    <Switch
                        checked={settings.gym_monitor_streaming}
                        onChange={() => handleToggle('gym_monitor_streaming')}
                    />
                </section>

                {/* 3. Live Status (Ghost Mode Global) */}
                <section style={{
                    background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ paddingRight: '16px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{t('Global Live Status')}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {t('Let friends see when you are currently working out. Turn OFF to go')} <b>{t('Ghost Mode 👻')}</b>.
                        </p>
                    </div>
                    <Switch
                        checked={settings.live_status}
                        onChange={() => handleToggle('live_status')}
                    />
                </section>

                <div style={{ marginTop: '16px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.2)' }}>
                    <h4 style={{ color: 'var(--warning)', marginBottom: '8px' }}>{t('Data Privacy Note (GDPR)')}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        {t('IronCircle sends only necessary data to gym monitors (Username, Exercise, Set). We never share biometric data like weight or body fat percentage on public screens. You can revoke monitor access at any time using the toggle above.')}
                    </p>
                </div>

            </div>
        </div>
    );
}

// Simple Switch Component
function Switch({ checked, onChange }) {
    return (
        <div
            onClick={onChange}
            style={{
                width: '52px',
                height: '32px',
                background: checked ? 'var(--primary)' : 'var(--border)',
                borderRadius: '100px',
                padding: '4px',
                cursor: 'pointer',
                transition: 'background 0.3s',
                position: 'relative',
                flexShrink: 0
            }}
        >
            <div style={{
                width: '24px',
                height: '24px',
                background: '#fff',
                borderRadius: '50%',
                transform: checked ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
        </div>
    );
}
