"use client";

import Link from 'next/link';

export default function SettingsHubPage() {
    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/profile" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>Settings</h1>
            </header>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr' }}>

                {/* 1. Account & Security */}
                <Link href="/profile/settings/account" style={{ textDecoration: 'none' }}>
                    <div className="setting-card">
                        <div className="icon">🔐</div>
                        <div className="content">
                            <h3>Account & Security</h3>
                            <p>Email, Password, Data Sync & Privacy</p>
                        </div>
                        <div className="arrow">→</div>
                    </div>
                </Link>

                {/* 2. My Profile (Physical Stats) */}
                <Link href="/profile/settings/profile" style={{ textDecoration: 'none' }}>
                    <div className="setting-card">
                        <div className="icon">👤</div>
                        <div className="content">
                            <h3>My Profile</h3>
                            <p>Avatar, Name, Height, Weight & Gender</p>
                        </div>
                        <div className="arrow">→</div>
                    </div>
                </Link>

                {/* 3. Training Preferences */}
                <Link href="/profile/settings/preferences" style={{ textDecoration: 'none' }}>
                    <div className="setting-card">
                        <div className="icon">⚙️</div>
                        <div className="content">
                            <h3>Training Preferences</h3>
                            <p>Workout Goals & Smart Suggestions</p>
                        </div>
                        <div className="arrow">→</div>
                    </div>
                </Link>

                {/* 4. Gym & Team */}
                <Link href="/profile/settings/gym" style={{ textDecoration: 'none' }}>
                    <div className="setting-card">
                        <div className="icon">🏢</div>
                        <div className="content">
                            <h3>Gym & Team</h3>
                            <p>Membership, Trainer & Staff Access</p>
                        </div>
                        <div className="arrow">→</div>
                    </div>
                </Link>

                {/* 5. Privacy & Data */}
                <Link href="/profile/settings/privacy" style={{ textDecoration: 'none' }}>
                    <div className="setting-card">
                        <div className="icon">👻</div>
                        <div className="content">
                            <h3>Privacy & Data</h3>
                            <p>Ghost Mode, Visibility & Monitors</p>
                        </div>
                        <div className="arrow">→</div>
                    </div>
                </Link>

            </div>

            <style jsx>{`
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
                .content {
                    flex: 1;
                }
                .content h3 {
                    margin: 0 0 4px 0;
                    font-size: 1.1rem;
                    color: var(--text-main);
                }
                .content p {
                    margin: 0;
                    font-size: 0.9rem;
                    color: var(--text-muted);
                }
                .arrow {
                    color: var(--text-muted);
                    font-size: 1.2rem;
                }
            `}</style>
        </div>
    );
}
