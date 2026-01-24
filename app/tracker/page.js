"use client";

import { useStore } from '@/lib/store';
import { useGeoTracker } from '@/lib/hooks/useGeoTracker';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function TrackerPage() {
    const { user, saveUserGym, removeUserGym, setDefaultGym } = useStore();
    const { status, currentLocation, distanceToGym, isAtGym, workoutSession, startTracking, stopTracking, warning } = useGeoTracker();
    const [elapsed, setElapsed] = useState(0);
    const supabase = createClient();
    const [history, setHistory] = useState([]);
    const [showManage, setShowManage] = useState(false);
    const [isLongLoading, setIsLongLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!user) {
                setIsLongLoading(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [user]);

    // Manage State
    const [addMode, setAddMode] = useState(false); // 'gps', 'manual', false
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [manualLocation, setManualLocation] = useState(null); // { lat, lng, name }
    const [newGymLabel, setNewGymLabel] = useState('My Gym');

    // Timer Logic
    useEffect(() => {
        let interval;
        if (workoutSession?.start_time) {
            const updateTimer = () => {
                const start = new Date(workoutSession.start_time);
                setElapsed(Math.floor((new Date() - start) / 1000));
            };
            updateTimer();
            interval = setInterval(updateTimer, 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(interval);
    }, [workoutSession]);

    // Fetch History
    useEffect(() => {
        if (!user) return;
        const fetchHistory = async () => {
            const { data } = await supabase
                .from('workout_sessions')
                .select('*, gyms(name)')
                .eq('user_id', user.id)
                .not('end_time', 'is', null)
                .order('start_time', { ascending: false })
                .limit(10);
            if (data) setHistory(data);
        };
        fetchHistory();
    }, [user, workoutSession]);

    const formatTime = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const formatRange = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        return `${s.getHours()}:${s.getMinutes().toString().padStart(2, '0')} - ${e.getHours()}:${e.getMinutes().toString().padStart(2, '0')}`;
    };

    const handleSearchAddress = async () => {
        if (!searchQuery) return;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setSearchResults(data);
        } catch (err) {
            console.error(err);
            alert("Failed to search address");
        }
    };

    const handleSaveGym = async (name, lat, lng, address = null, source = 'manual') => {
        try {
            console.log("Saving gym:", name, lat, lng, address, source);

            let finalAddress = address;
            if (source === 'gps' && !finalAddress) {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await res.json();
                    if (data && data.display_name) {
                        finalAddress = data.display_name;
                        // Auto-fill label if empty?
                        // if (!newGymLabel || newGymLabel === 'My Gym') setNewGymLabel(data.address.road || 'New Gym');
                    }
                } catch (e) {
                    console.warn("Reverse geocode failed", e);
                }
            }

            await saveUserGym(name, lat, lng, newGymLabel, finalAddress, source);
            setAddMode(false);
            setManualLocation(null);
            setSearchQuery('');
            setSearchResults([]);
            setNewGymLabel('My Gym');
            console.log("Gym saved successfully");
        } catch (err) {
            console.error("Failed to save gym:", err);
            alert(`Failed to save gym: ${err.message}`);
        }
    };

    if (!user) {
        if (isLongLoading) {
            return (
                <div style={{
                    minHeight: '100vh',
                    background: 'var(--background)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '24px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-main)' }}>Connection Issue</h2>
                        <p>We're having trouble loading your data.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', width: '100%', maxWidth: '300px' }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                color: '#000',
                                background: 'var(--brand-yellow)',
                                border: 'none',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Retry Connection
                        </button>
                        <button
                            onClick={async () => {
                                supabase.auth.signOut().catch(err => console.error("Sign out ignored:", err));
                                localStorage.clear();
                                sessionStorage.clear();
                                window.location.href = '/login';
                            }}
                            style={{
                                color: 'var(--text-muted)',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer'
                            }}
                        >
                            Log Out & Reset
                        </button>
                    </div>
                </div>
            );
        }
        return (
            <div style={{
                minHeight: '100vh',
                background: 'var(--background)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className="spinner"></div>
                    <p>Syncing...</p>
                </div>
                <style jsx>{`
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid var(--surface-highlight);
                        border-top: 4px solid var(--brand-yellow);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (showManage) {
        return (
            <div className="container" style={{ paddingBottom: '100px', paddingTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                    <button onClick={() => setShowManage(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', marginRight: '16px', cursor: 'pointer', color: 'var(--text-main)' }}>←</button>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Manage Gyms</h1>
                </div>

                {!addMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {user.gyms?.map(gym => (
                            <div key={gym.id} style={{
                                background: 'var(--surface)',
                                border: gym.isDefault ? '1px solid var(--brand-yellow)' : '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: gym.isDefault ? 'var(--brand-yellow)' : 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {gym.label || gym.name}
                                        <span title={gym.source === 'gps' ? 'Auto-Detected via GPS' : 'Manually Added'} style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                            {gym.source === 'gps' ? '📍' : '🗺️'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {gym.address || gym.name}
                                    </div>
                                    {gym.isDefault && <span style={{ fontSize: '0.7rem', color: 'var(--brand-yellow)', fontWeight: 'bold' }}>DEFAULT</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {!gym.isDefault && (
                                        <button onClick={() => setDefaultGym(gym.id)} style={{ padding: '8px', fontSize: '0.8rem', background: 'var(--surface-highlight)', color: 'var(--text-main)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                            Set Default
                                        </button>
                                    )}
                                    <button onClick={() => removeUserGym(gym.id)} style={{ padding: '8px', fontSize: '0.8rem', background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={() => setAddMode('select')}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                border: '2px dashed var(--border)',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                marginTop: '16px',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--brand-yellow)'; e.currentTarget.style.color = 'var(--brand-yellow)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                            + Add New Gym
                        </button>
                    </div>
                )}

                {addMode === 'select' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button onClick={() => setAddMode('gps')} style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '1.1rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '1.5rem' }}>📍</span>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>Use GPS Location</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-detect where you are now</div>
                            </div>
                        </button>
                        <button onClick={() => setAddMode('manual')} style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '1.1rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '1.5rem' }}>🗺️</span>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>Search Address</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Find by name or street</div>
                            </div>
                        </button>
                        <button onClick={() => setAddMode(false)} style={{ padding: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                    </div>
                )}

                {addMode === 'gps' && (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ marginBottom: '16px' }}>
                            {currentLocation ? `Found: ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : "Locating..."}
                        </p>
                        {warning && <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '16px' }}>{warning}</p>}

                        <input
                            type="text"
                            placeholder="Label (e.g. Work Gym)"
                            value={newGymLabel}
                            onChange={(e) => setNewGymLabel(e.target.value)}
                            style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)' }}
                        />

                        {currentLocation ? (
                            <button
                                onClick={() => handleSaveGym('GPS Location', currentLocation.lat, currentLocation.lng, null, 'gps')}
                                style={{ width: '100%', padding: '16px', background: 'var(--brand-yellow)', color: '#000', border: 'none', borderRadius: '100px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}
                            >
                                Save This Location
                            </button>
                        ) : (
                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                        )}
                        <button onClick={() => setAddMode(false)} style={{ marginTop: '16px', background: 'none', border: 'none', color: 'var(--text-muted)' }}>Cancel</button>
                    </div>
                )}

                {addMode === 'manual' && (
                    <div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input
                                type="text"
                                placeholder="Street, City..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)' }}
                            />
                            <button onClick={handleSearchAddress} style={{ padding: '0 20px', background: 'var(--brand-yellow)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Search</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                            {searchResults.map(result => (
                                <div key={result.place_id}
                                    onClick={() => setManualLocation({ lat: result.lat, lng: result.lon, name: result.display_name })}
                                    style={{ padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    <div style={{ fontSize: '0.9rem' }}>{result.display_name}</div>
                                </div>
                            ))}
                        </div>

                        {manualLocation && (
                            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Selected: {manualLocation.name}</p>
                                <input
                                    type="text"
                                    placeholder="Label (e.g. Vacation Gym)"
                                    value={newGymLabel}
                                    onChange={(e) => setNewGymLabel(e.target.value)}
                                    style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)' }}
                                />
                                <button
                                    onClick={() => handleSaveGym(manualLocation.name.split(',')[0], manualLocation.lat, manualLocation.lng, manualLocation.name, 'manual')}
                                    style={{ width: '100%', padding: '16px', background: 'var(--brand-yellow)', color: '#000', border: 'none', borderRadius: '100px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}
                                >
                                    Save Gym
                                </button>
                            </div>
                        )}
                        <button onClick={() => setAddMode(false)} style={{ width: '100%', marginTop: '16px', padding: '12px', background: 'none', border: 'none', color: 'var(--text-muted)' }}>Cancel</button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingBottom: '100px', paddingTop: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--text-main)' }}>Gym Tracker</h1>
                <button
                    onClick={() => setShowManage(true)}
                    style={{ fontSize: '0.9rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                    Manage Gyms
                </button>
            </div>

            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                {user.auto_tracking_enabled ? 'Auto-Tracking Enabled' : 'Manual Mode'}
            </p>

            {warning && (
                <div style={{
                    background: 'rgba(255, 152, 0, 0.1)',
                    border: '1px solid var(--warning)',
                    color: 'var(--warning)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: '600',
                    animation: 'pulse 2s infinite'
                }}>
                    <span>⚠️</span>
                    {warning}
                </div>
            )}

            <div style={{
                background: 'var(--surface)',
                borderRadius: '24px',
                padding: '32px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)'
            }}>
                {/* Status Indicator */}
                <div style={{
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    background: workoutSession
                        ? 'radial-gradient(circle, var(--accent) 0%, rgba(255, 61, 0, 0.2) 70%)' // Deep Orange Glow
                        : 'var(--surface-highlight)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: workoutSession ? '0 0 40px rgba(255, 61, 0, 0.4)' : 'inset 0 0 20px rgba(0,0,0,0.5)',
                    border: workoutSession ? '4px solid var(--accent)' : '4px solid var(--border)',
                    transition: 'all 0.5s ease'
                }}>
                    <span style={{ fontSize: '2.5rem', filter: workoutSession ? 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none' }}>
                        {workoutSession ? '🔥' : '📍'}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', marginTop: '8px', color: 'var(--text-main)', letterSpacing: '1px' }}>
                        {workoutSession ? 'ACTIVE' : 'READY'}
                    </span>
                </div>

                {/* Info */}
                <div>
                    {workoutSession ? (
                        <>
                            <h2 style={{ fontSize: '3.5rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--text-main)', textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>
                                {formatTime(elapsed)}
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Session Duration</p>
                            <div style={{ marginTop: '16px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', display: 'inline-block' }}>
                                <span style={{ color: 'var(--brand-yellow)', fontWeight: 'bold' }}>
                                    {user.gyms?.find(g => g.id === workoutSession.gym_id)?.label || workoutSession.gyms?.name || 'Gym Session'}
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px', color: 'var(--text-main)' }}>
                                {isAtGym ? "You're at the Gym!" : "Not at Gym"}
                            </h2>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                Active Gym: <span style={{ color: 'var(--brand-yellow)', fontWeight: 'bold' }}>{user.gymId ? (user.gyms?.find(g => g.id === user.gymId)?.label || 'Default') : 'None'}</span>
                            </div>
                            {distanceToGym !== null && distanceToGym < 9000 && (
                                <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                    DISTANCE: {Math.round(distanceToGym)}m
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Actions */}
                <button
                    onClick={() => workoutSession ? stopTracking() : startTracking(user.gymId)}
                    disabled={!user.gymId}
                    style={{
                        padding: '18px 48px',
                        fontSize: '1.1rem',
                        fontWeight: '800',
                        borderRadius: '100px',
                        border: 'none',
                        background: workoutSession ? 'transparent' : 'var(--brand-yellow)',
                        color: workoutSession ? 'var(--error)' : '#000',
                        border: workoutSession ? '2px solid var(--error)' : 'none',
                        cursor: user.gymId ? 'pointer' : 'not-allowed',
                        opacity: user.gymId ? 1 : 0.5,
                        width: '100%',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        boxShadow: workoutSession ? 'none' : '0 4px 20px rgba(250, 255, 0, 0.3)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {workoutSession ? 'Stop Workout' : 'Start Workout'}
                </button>

                {!user.gymId && (
                    <button onClick={() => setShowManage(true)} style={{ color: 'var(--brand-yellow)', fontSize: '0.9rem', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', marginTop: '8px' }}>
                        Set Home Gym Required
                    </button>
                )}
            </div>

            {/* History Section */}
            {history.length > 0 && (
                <section>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Recent Sessions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {history.map(session => (
                            <div key={session.id} style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                        {formatDate(session.start_time)}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {formatRange(session.start_time, session.end_time)}
                                    </div>
                                    {/* Matched Friends */}
                                    {session.matchedFriends && session.matchedFriends.length > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginRight: '4px' }}>With:</span>
                                            {session.matchedFriends.map(f => (
                                                <img
                                                    key={f.id}
                                                    src={f.avatar}
                                                    alt={f.name}
                                                    title={f.name}
                                                    style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid var(--border)' }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1.1rem' }}>
                                        {Math.round((session.duration || 0) / 60)} min
                                    </div>
                                    {session.type === 'auto' && (
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                            Auto
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <BottomNav />
        </div>
    );
}
