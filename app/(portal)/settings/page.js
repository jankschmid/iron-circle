"use client";

import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalSettingsPage() {
    const { user } = useStore();
    const router = useRouter();
    const [supabase] = useState(() => createClient());

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (!user) return <div style={{ padding: '40px' }}>Loading...</div>;

    return (
        <div className="portal-container" style={{ padding: '40px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>My Profile & Settings</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                Manage your B2B Portal account.
            </p>

            <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Account Information</h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Email</div>
                        <div style={{ fontWeight: 'bold' }}>{user.email || 'N/A'}</div>
                    </div>
                </div>
            </div>

            <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--error)' }}>Danger Zone</h2>
                <button 
                    onClick={handleLogout}
                    style={{ background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    Log Out
                </button>
            </div>
        </div>
    );
}
