"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase'; // Keep standard client for Auth/RPC
import GymMonitor from '@/components/GymMonitor';

// Helpers
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result.slice(0, 3) + '-' + result.slice(3);
}

export default function TvPairingPage() {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState('connecting'); // connecting, ready, linked, error
    const [gymData, setGymData] = useState(null); // { id, key }
    const [error, setError] = useState('');

    // Singleton client
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        // Clear old storage if we are reloading to force a clean slate?
        // Or check if valid? For now, let's start fresh or check.
        // Actually, let's NOT rely on localStorage for the "Connected" state wrapper if possible,
        // but for persistence on refresh we need it.
        // However, if we want to support "Disconnect", we should verify the stored ID is still valid.

        checkExistingConnection();
    }, []);

    const checkExistingConnection = async () => {
        const storedGymId = localStorage.getItem('tv_gym_id');
        const storedKey = localStorage.getItem('tv_gym_key'); // We will now store this

        if (storedGymId && storedKey) {
            // Verify if still active?
            // We can just try to render. If GymMonitor fails, it handles auth error?
            // But we want to handle "Disconnect" event.
            setStatus('linked');
            setGymData({ id: storedGymId, key: storedKey });

            // Start validity polling
            startValidityPolling(storedGymId);
        } else {
            initializePairing();
        }
    };

    const startValidityPolling = (gymId) => {
        // Poll to check if we are still linked (Pseudo-Auth check)
        // Since we don't have the monitor ID easily here (unless we stored it),
        // we can just check if the KEY is still valid or if our session works.
        // Actually, simpler: Just let GymMonitor run.
        // But user wants to be kicked out if Admin disconnects.
        // Admin disconnect sets `gym_monitors.gym_id` to NULL.
        // The TV page doesn't know its `monitor_id` if it just loaded from localStorage.
        // Store monitor_id too!

        const monitorId = localStorage.getItem('tv_monitor_id');
        if (!monitorId) return;

        const interval = setInterval(async () => {
            const { data } = await supabase.from('gym_monitors').select('status').eq('id', monitorId).single();
            if (!data || data.status !== 'active') {
                // Disconnected!
                disconnectClient();
            }
        }, 5000);

        return () => clearInterval(interval);
    };

    const disconnectClient = () => {
        console.log("Disconnecting Client...");
        localStorage.removeItem('tv_gym_id');
        localStorage.removeItem('tv_gym_key');
        localStorage.removeItem('tv_monitor_id');
        setGymData(null);
        setStatus('connecting');
        initializePairing();
        // Force reload to clean state if needed, or just re-init
        window.location.reload();
    };

    const initializePairing = async () => {
        try {
            const newCode = generateCode();
            setCode(newCode);

            // Register
            const rpcPromise = supabase.rpc('register_new_monitor_device', { p_code: newCode });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 10000));

            const { data: monitorId, error: regError } = await Promise.race([rpcPromise, timeoutPromise]);

            if (regError) throw regError;

            // Store monitor ID for later validity checks
            localStorage.setItem('tv_monitor_id', monitorId);

            setStatus('ready');

            // Poll for linkage
            const interval = setInterval(async () => {
                // Fetch status AND gym details (joined)
                const { data, error } = await supabase
                    .from('gym_monitors')
                    .select('gym_id, status, gyms(display_key)')
                    .eq('pairing_code', newCode)
                    .single();

                if (data && data.gym_id && data.status === 'active') {
                    clearInterval(interval);

                    const key = data.gyms?.display_key;
                    if (!key) {
                        console.error("Gym found but no key?");
                        return;
                    }

                    // Success
                    localStorage.setItem('tv_gym_id', data.gym_id);
                    localStorage.setItem('tv_gym_key', key);

                    setGymData({ id: data.gym_id, key: key });
                    setStatus('linked');

                    // Start checking for disconnects
                    startValidityPolling(data.gym_id);
                }
            }, 3000);

            return () => clearInterval(interval);

        } catch (err) {
            console.error("Pairing Error:", err);
            setError("Failed to connect. Please reload.");
            setStatus('error');
        }
    };

    return (
        <div style={{
            height: '100vh', width: '100vw',
            background: '#000', color: '#fff',
            display: 'flex', flexDirection: 'column',
            fontFamily: 'Inter, sans-serif'
        }}>
            {status === 'linked' && gymData ? (
                <GymMonitor gymId={gymData.id} initialKey={gymData.key} />
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {status === 'connecting' && <div style={{ fontSize: '2rem', color: '#666' }}>Connecting to Server...</div>}

                    {status === 'ready' && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#888' }}>
                                Go to your Admin Dashboard and enter this code:
                            </div>
                            <div style={{
                                fontSize: '6rem', fontWeight: '900', letterSpacing: '8px',
                                color: '#FFC800', background: '#111',
                                padding: '40px 80px', borderRadius: '24px',
                                border: '2px solid #333',
                                display: 'inline-block', marginBottom: '40px'
                            }}>
                                {code}
                            </div>
                            <div style={{ fontSize: '1rem', color: '#444' }}>Waiting for connection...</div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div style={{ color: 'red', textAlign: 'center' }}>
                            <h1>Error</h1>
                            <p>{error}</p>
                            <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1.2rem' }}>Retry</button>
                        </div>
                    )}

                    <div style={{ position: 'absolute', bottom: '40px', opacity: 0.3 }}>
                        <span style={{ fontWeight: 'bold', letterSpacing: '1px' }}>IRON CIRCLE</span> TV
                    </div>
                </div>
            )}
        </div>
    );
}
