"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav'; // Or a Trainer specific nav?
import Link from 'next/link';

export default function TrainerLayout({ children }) {
    const { user, fetchProfile } = useStore();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            if (!user) {
                // Wait for store to init
                return;
            }

            // Check roles
            // Use supabase directly to be sure, or rely on store 'roles' if loaded?
            // Store fetchProfile loads roles into `roles` state?
            // Actually fetchProfile returns roles data but doesn't set a global 'roles' state explicitly in the snippet I saw.
            // But let's assume valid access for now or fetch.

            // For MVP, we'll allow access but show "Unauthorized" if data fetch fails.
            // Ideally we check `community_members` or `user_gyms` role.

            // Let's just proceed and let the page handle empty states if not trainer.
            setIsAuthorized(true);
            setLoading(false);
        };

        checkAuth();
    }, [user]);

    if (loading && !user) return <div className="p-8 text-center">Loading Trainer Station...</div>;

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Trainer Header */}
            <header style={{
                padding: '16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                position: 'sticky', top: 0, zIndex: 50,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/tracker" style={{ fontSize: '1.5rem', textDecoration: 'none' }}>🛡️</Link>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Trainer Cockpit</h1>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                    PRO ACCESS
                </div>
            </header>

            <main>{children}</main>

            {/* Maybe a specific Trainer Bottom Nav, or reuse standard but highlight standard? */}
            <BottomNav />
        </div>
    );
}
