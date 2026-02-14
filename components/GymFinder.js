"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/context/TranslationContext';


export default function GymFinder() {
    const { t } = useTranslation();
    const { fetchGyms, joinCommunity } = useStore();
    const [gyms, setGyms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [joiningId, setJoiningId] = useState(null);

    useEffect(() => {
        // Auto-fetch on mount? Or wait for user interaction?
        // Let's try to get location immediately for best UX
        locateAndFetch();
    }, []);

    const locateAndFetch = () => {
        setLoading(true);
        setLocationError(null);

        if (!navigator.geolocation) {
            fetchGyms(null, null).then(data => {
                setGyms(data || []);
                setLoading(false);
            });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchGyms(position.coords.latitude, position.coords.longitude).then(data => {
                    setGyms(data || []);
                    setLoading(false);
                });
            },
            (error) => {
                console.warn("Location access denied or failed", error);

                let msg = t("Couldn't get your location.");
                if (error.code === 1) msg = t("Location permission denied.");
                if (error.code === 2) msg = t("Location unavailable.");
                if (error.code === 3) msg = t("Location request timed out.");

                setLocationError(msg + " " + t("Showing all gyms."));
                // Fallback to fetch all (or top 50)
                fetchGyms(null, null).then(data => {
                    setGyms(data || []);
                    setLoading(false);
                });
            }
        );
    };

    const handleJoin = async (gym) => {
        setJoiningId(gym.id);
        try {
            await joinCommunity(null, gym.id, gym.name, false);
            // joinCommunity handles the user_gyms insert and updates the store
            // The parent component (Home) should react to user.gymId change and hide this component
        } catch (err) {
            alert(t("Failed to join gym: ") + err.message);
            setJoiningId(null);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                <p>{t('Finding gyms near you...')}</p>
                <style jsx>{`
                    .spinner {
                        width: 30px; height: 30px;
                        border: 3px solid var(--surface-highlight);
                        border-top: 3px solid var(--primary);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📍</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{t('Find Your Gym')}</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    {t('Connect with your local gym to see the live leaderboard, join events, and track your workouts.')}
                </p>
                {locationError && <p style={{ color: 'var(--brand-yellow)', fontSize: '0.8rem', marginTop: '8px' }}>{locationError}</p>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                {gyms.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                        {t('No gyms found.')} <br />
                        <button onClick={locateAndFetch} style={{ marginTop: '12px', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>{t('Try Again')}</button>
                    </div>
                ) : (
                    gyms.map(gym => (
                        <div key={gym.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '16px', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                    {gym.logo_url ? <img src={gym.logo_url} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : '🏋️'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{gym.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{gym.city || t('Unknown City')}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleJoin(gym)}
                                disabled={joiningId === gym.id}
                                style={{
                                    background: joiningId === gym.id ? 'var(--text-muted)' : 'var(--primary)',
                                    color: '#000',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    opacity: joiningId && joiningId !== gym.id ? 0.5 : 1
                                }}
                            >
                                {joiningId === gym.id ? t('Joining...') : t('Select')}
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{t("Don't see your gym?")}</p>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    {t('Create a Gym')}
                </button>
            </div>
        </div>
    );
}
