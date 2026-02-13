"use client";

import Link from 'next/link';
import { useTranslation } from '@/context/TranslationContext';
import LanguageSelector from '@/components/ui/LanguageSelector';

export default function SettingsHubPage() {
    const { t } = useTranslation();

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href="/profile" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>←</Link>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{t('Settings')}</h1>
                </div>

                {/* Language Selector */}
                <LanguageSelector />
            </header>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr' }}>

                {/* 1. Account & Security */}
                <Link href="/profile/settings/account" style={{ textDecoration: 'none' }}>
                    <div className="setting-card">
                        <div className="icon">🔐</div>
                        <div className="content">
                            <h3>{t('Account & Security')}</h3>
                            <p>{t('Email, Password, Data Sync & Privacy')}</p>
                        </div>
                        <div className="arrow">→</div>
                    </div>
                </Link>

                {/* 2. My Profile (Physical Stats) */}
                <Link href="/profile/settings/profile" style={{ textDecoration: 'none' }}>
                    <div className="setting-card">
                        <div className="icon">👤</div>
                        <div className="content">
                            <h3>{t('My Profile')}</h3>
                            <p>{t('Avatar, Name, Height, Weight & Gender')}</p>
                        </div>
                        <div className="arrow">→</div>
                    </div>
                </Link>

                {/* 3. Training Preferences */}
                <Link href="/profile/settings/preferences" style={{ textDecoration: 'none' }}>
                    <div className="setting-card">
                        <div className="icon">⚙️</div>
                        <div className="content">
                            <h3>{t('Training Preferences')}</h3>
                            <p>{t('Workout Goals & Smart Suggestions')}</p>
                        </div>
                        <div className="arrow">→</div>
                    </div>
                </Link>

                {/* 4. Gym & Team */}
                <Link href="/profile/settings/gym" style={{ textDecoration: 'none' }}>
                    <div className="setting-card">
                        <div className="icon">🏢</div>
                        <div className="content">
                            <h3>{t('Gym & Team')}</h3>
                            <p>{t('Membership, Trainer & Staff Access')}</p>
                        </div>
                        <div className="arrow">→</div>
                    </div>
                </Link>

                {/* 5. Privacy & Data */}
                <Link href="/profile/settings/privacy" style={{ textDecoration: 'none' }}>
                    <div className="setting-card">
                        <div className="icon">👻</div>
                        <div className="content">
                            <h3>{t('Privacy & Data')}</h3>
                            <p>{t('Ghost Mode, Visibility & Monitors')}</p>
                        </div>
                        <div className="arrow">→</div>
                    </div>
                </Link>

            </div>
            {/* Same styles as before */}
            <style jsx>{`
                .container { max-width: 600px; margin: 0 auto; padding: 0 20px; }
                .setting-card {
                    background: var(--surface);
                    padding: 20px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    transition: transform 0.2s, background 0.2s;
                    cursor: pointer;
                }
                .setting-card:active {
                    transform: scale(0.98);
                    background: var(--surface-highlight);
                }
                .icon {
                    font-size: 1.5rem;
                    background: var(--surface-highlight);
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                }
                .content { flex: 1; }
                .content h3 { margin: 0 0 4px 0; font-size: 1.1rem; color: var(--text-main); }
                .content p { margin: 0; font-size: 0.9rem; color: var(--text-muted); }
                .arrow { color: var(--text-muted); font-size: 1.2rem; }
            `}</style>
        </div>
    );
}
