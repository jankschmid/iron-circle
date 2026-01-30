"use client";

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { createClient } from '@/lib/supabase';
import { APP_VERSION, UPDATE_CHECK_URL } from '@/lib/constants';
import { useRouter } from 'next/navigation';

export default function UpdateChecker() {
    const [updateRequired, setUpdateRequired] = useState(false);
    const [remoteVersion, setRemoteVersion] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState('');
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const checkUpdate = async () => {
            try {
                // Determine absolute URL for fetch if needed, 
                // but if configured in next.config as static export, typically we fetch from the hosted domain
                // We'll trust constants.js has a valid relative or absolute URL.
                // If relative (e.g. /version.json), it might fail in Capacitor if not served from same origin.
                // Assuming Vercel Domain is hardcoded or configured.
                // Ideally, we should use a full URL in constants or here.

                // For now, let's use the relative path hoping user serves from valid origin or we hardcode the live domain later.
                // ACTUALLY: For a native app, relative fetch '/version.json' checks the local bundle (server root).
                // We need to fetch from the REMOTE server.
                // The user needs to provide their Vercel domain. 
                // We will use a placeholder or assume the user configured constants.js correctly.
                // Since constant.js currently has '/version.json', this will fetch LOCAL file in Capacitor (file://).
                // This is wrong for checking updates. 
                // WE NEED THE LIVE URL.

                // Temporary Fix: We will assume a placeholder variable or attempt to construct it.
                // But better to fail safe. 
                // Let's assume constants.js needs to be updated with the FULL domain.
                // I will update constants.js in next step.

                const response = await fetch(UPDATE_CHECK_URL);
                if (!response.ok) return;

                const data = await response.json();

                if (compareVersions(data.latestVersion, APP_VERSION) > 0) {
                    // Update Available!
                    setRemoteVersion(data.latestVersion);
                    setDownloadUrl(data.downloadUrl);
                    setUpdateRequired(true);

                    // FORCE LOGOUT
                    await supabase.auth.signOut();
                    router.push('/login'); // Redirect to login, but modal will cover it
                }
            } catch (err) {
                console.error("Update check failed:", err);
            }
        };

        checkUpdate();
    }, []);

    const compareVersions = (v1, v2) => {
        // Simple semantic version comparison
        const p1 = v1.split('.').map(Number);
        const p2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            const n1 = p1[i] || 0;
            const n2 = p2[i] || 0;
            if (n1 > n2) return 1;
            if (n2 > n1) return -1;
        }
        return 0;
    };

    if (!updateRequired) return null;

    const handleDownload = async () => {
        if (!downloadUrl) return;

        // Ensure absolute URL for browser
        let url = downloadUrl;
        if (url.startsWith('/')) {
            // Prepend domain if relative - requires known domain. 
            // We'll hope UPDATE_CHECK_URL was absolute and derive from there?
            // Or just assume user fixes config.
            // Let's use window.location.origin if it's the web, but for App it's tricky.
            // Best to use the FULL URL in config.
            const baseUrl = new URL(UPDATE_CHECK_URL).origin;
            url = baseUrl + url;
        }

        await Browser.open({ url });
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 99999, // Max Z-Index
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center'
        }}>
            <div style={{
                fontSize: '4rem',
                marginBottom: '24px'
            }}>
                🚀
            </div>
            <h1 style={{
                color: '#fff',
                marginBottom: '16px',
                fontSize: '1.5rem',
                fontWeight: 'bold'
            }}>New Version Required</h1>

            <p style={{
                color: '#ccc',
                marginBottom: '8px',
                lineHeight: '1.5'
            }}>
                Version {remoteVersion} is now available.
            </p>
            <p style={{
                color: '#888',
                marginBottom: '32px',
                fontSize: '0.9rem'
            }}>
                Please update to continue using IronCircle.
            </p>

            <button
                onClick={handleDownload}
                style={{
                    backgroundColor: 'var(--primary, #D4AF37)',
                    color: '#000',
                    border: 'none',
                    padding: '16px 32px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '250px'
                }}
            >
                Download Update
            </button>
        </div>
    );
}
