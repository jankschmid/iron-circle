"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import dynamic from 'next/dynamic';

// Dynamic import keeps PermissionGate JS out of the initial bundle
const PermissionGate = dynamic(() => import('@/components/PermissionGate'), { ssr: false });

const PERM_DONE_KEY = 'iron-circle-perm-checked';

/**
 * AppShell
 * Thin client wrapper that shows the PermissionGate once per install
 * (stored in localStorage) after the user is signed in.
 */
export default function AppShell({ children }) {
    const { user } = useStore();
    // null = still deciding, true = show gate, false = gate done
    const [showGate, setShowGate] = useState(null);

    useEffect(() => {
        // Only show on native Android/iOS
        const isNative = window.Capacitor?.isNativePlatform?.();
        if (!isNative) {
            setShowGate(false);
            return;
        }
        // Only show when user is logged in
        if (!user) {
            setShowGate(false);
            return;
        }
        // Only once per install (or until permissions change)
        const done = localStorage.getItem(PERM_DONE_KEY);
        setShowGate(!done);
    }, [user?.id]);

    const handleDone = () => {
        localStorage.setItem(PERM_DONE_KEY, '1');
        setShowGate(false);
    };

    // Still determining
    if (showGate === null) return null;

    return (
        <>
            {children}
            {showGate && <PermissionGate onContinue={handleDone} />}
        </>
    );
}
