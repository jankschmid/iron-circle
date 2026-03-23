"use client";

import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';

/**
 * PermissionGate
 * Shows a fullscreen permission checker after login on native Android/iOS.
 * Lets the user grant Location + Notifications, then enter the app.
 * Skippable after a short delay.
 *
 * Props:
 *   onContinue — callback when user is done (granted or skipped)
 */
export default function PermissionGate({ onContinue }) {
    const [locStatus, setLocStatus] = useState('unknown');  // unknown | granted | denied
    const [notifStatus, setNotifStatus] = useState('unknown');
    const [checking, setChecking] = useState(true);
    const [canSkip, setCanSkip] = useState(false);

    const isNative = typeof window !== 'undefined' &&
        window.Capacitor?.isNativePlatform?.();

    // On mount: check current states
    useEffect(() => {
        const check = async () => {
            if (!isNative) {
                // On web, skip this gate entirely
                onContinue();
                return;
            }
            try {
                const locPerm = await Geolocation.checkPermissions();
                setLocStatus(locPerm.location === 'granted' ? 'granted' : 'unknown');
            } catch { setLocStatus('unknown'); }

            try {
                const notifPerm = await PushNotifications.checkPermissions();
                setNotifStatus(notifPerm.receive === 'granted' ? 'granted' : 'unknown');
            } catch { setNotifStatus('unknown'); }

            setChecking(false);
        };
        check();

        // Allow skip after 4 seconds
        const t = setTimeout(() => setCanSkip(true), 4000);
        return () => clearTimeout(t);
    }, []);

    const requestLocation = async () => {
        try {
            const result = await Geolocation.requestPermissions({ permissions: ['location'] });
            setLocStatus(result.location === 'granted' ? 'granted' : 'denied');
        } catch {
            setLocStatus('denied');
        }
    };

    const requestNotifications = async () => {
        try {
            const result = await PushNotifications.requestPermissions();
            setNotifStatus(result.receive === 'granted' ? 'granted' : 'denied');
        } catch {
            setNotifStatus('denied');
        }
    };

    // Auto-continue when both granted
    useEffect(() => {
        if (locStatus === 'granted' && notifStatus === 'granted') {
            const t = setTimeout(onContinue, 800);
            return () => clearTimeout(t);
        }
    }, [locStatus, notifStatus]);

    if (checking) {
        return (
            <div style={styles.overlay}>
                <div className="spinner" />
                <style>{spinnerCSS}</style>
            </div>
        );
    }

    const PermRow = ({ icon, label, desc, status, onRequest }) => {
        const isGranted = status === 'granted';
        const isDenied = status === 'denied';
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '20px', background: 'var(--surface)',
                border: `1px solid ${isGranted ? 'var(--primary)' : isDenied ? 'var(--error)' : 'var(--border)'}`,
                borderRadius: '14px',
                transition: 'border-color 0.3s ease'
            }}>
                <div style={{ fontSize: '2rem', flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--foreground)' }}>{label}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                    {isGranted ? (
                        <span style={{ fontSize: '1.4rem' }}>✅</span>
                    ) : (
                        <button
                            onClick={onRequest}
                            style={{
                                padding: '8px 16px',
                                background: isDenied ? 'rgba(255,23,68,0.1)' : 'var(--primary)',
                                color: isDenied ? 'var(--error)' : '#000',
                                border: isDenied ? '1px solid var(--error)' : 'none',
                                borderRadius: '100px',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {isDenied ? 'Denied' : 'Allow'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const allGranted = locStatus === 'granted' && notifStatus === 'granted';

    return (
        <div style={styles.overlay}>
            <div style={styles.card}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔐</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px', color: 'var(--foreground)' }}>
                        App Permissions
                    </h1>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                        IronCircle needs these permissions to track your gym visits and keep you updated.
                    </p>
                </div>

                {/* Permission Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    <PermRow
                        icon="📍"
                        label="Location"
                        desc="Required for auto-tracking gym visits and distance display"
                        status={locStatus}
                        onRequest={requestLocation}
                    />
                    <PermRow
                        icon="🔔"
                        label="Notifications"
                        desc="For workout reminders and progress alerts"
                        status={notifStatus}
                        onRequest={requestNotifications}
                    />
                </div>

                {/* Actions */}
                {allGranted ? (
                    <div style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: '700' }}>
                        ✅ All set! Entering app...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                            onClick={onContinue}
                            style={{
                                width: '100%', padding: '16px',
                                background: 'var(--primary)', color: '#000',
                                border: 'none', borderRadius: '12px',
                                fontWeight: '800', fontSize: '1rem',
                                cursor: 'pointer', opacity: allGranted ? 1 : 0.95
                            }}
                        >
                            Continue →
                        </button>
                        {canSkip && (
                            <button
                                onClick={onContinue}
                                style={{
                                    width: '100%', padding: '12px',
                                    background: 'transparent', color: 'var(--text-muted)',
                                    border: 'none', fontSize: '0.9rem',
                                    cursor: 'pointer', textDecoration: 'underline'
                                }}
                            >
                                Skip for now
                            </button>
                        )}
                    </div>
                )}
            </div>
            <style>{spinnerCSS}</style>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '24px',
    },
    card: {
        width: '100%',
        maxWidth: '420px',
        background: 'var(--surface)',
        borderRadius: '24px',
        padding: '32px 24px',
        border: '1px solid var(--border)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    }
};

const spinnerCSS = `
.spinner {
    width: 44px; height: 44px;
    border: 4px solid var(--surface-highlight);
    border-top: 4px solid var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
`;
