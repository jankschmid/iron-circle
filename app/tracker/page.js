"use client";

import { useStore } from '@/lib/store';
import { useGeoTracker } from '@/lib/hooks/useGeoTracker';
import BottomNav from '@/components/BottomNav';
import LiveStatus from '@/components/LiveStatus'; // Re-added Live Circle
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('../../components/MapPicker'), { ssr: false, loading: () => <div className="spinner"></div> });

function TrackerContent() {
    const { user, saveUserGym, removeUserGym, updateUserGym, setDefaultGym, updateUserProfile, fetchCommunities, joinCommunity, leaveCommunity, deleteSession, updateSession, friends, inviteToSession, joinSession, updateGym, deleteGlobalGym } = useStore();
    const { status, currentLocation, distanceToGym, isAtGym, workoutSession, startTracking, stopTracking, warning } = useGeoTracker();

    const searchParams = useSearchParams();
    const [elapsed, setElapsed] = useState(0);
    const supabase = createClient();
    const [history, setHistory] = useState([]);
    const [showManage, setShowManage] = useState(false);
    const [isLongLoading, setIsLongLoading] = useState(false);
    const [addMode, setAddMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [manualLocation, setManualLocation] = useState(null);
    const [newGymLabel, setNewGymLabel] = useState('My Gym');
    const [newGymName, setNewGymName] = useState(''); // For name-first flow
    const [addressSearchQuery, setAddressSearchQuery] = useState(''); // Separate address search
    const [successMessage, setSuccessMessage] = useState(''); // Success notification
    const [showCommunities, setShowCommunities] = useState(false);
    const [communities, setCommunities] = useState([]);
    const [communitySearchQuery, setCommunitySearchQuery] = useState('');
    const [joiningCommunity, setJoiningCommunity] = useState(null);
    const [editingSession, setEditingSession] = useState(null); // For Edit Modal
    const [deletingSessionId, setDeletingSessionId] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [editingSettingsGym, setEditingSettingsGym] = useState(null); // For User Settings Modal (Radius)
    // Removed unused editingGym state


    // Map State
    const [showSearchMap, setShowSearchMap] = useState(false); // For Search/Main add flow
    const [showConfirmMap, setShowConfirmMap] = useState(false); // For "Ready to create" adjustment
    const [showEditMap, setShowEditMap] = useState(false); // For Edit Modal
    const [mapCoordinates, setMapCoordinates] = useState(null); // { lat, lng }
    const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }

    const [warningMsg, setWarningMsg] = useState(''); // Local UI warning

    useEffect(() => {
        if (warningMsg) {
            const timer = setTimeout(() => setWarningMsg(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [warningMsg]);

    // Use warning from useGeoTracker AND local warningMsg
    const displayWarning = warning || warningMsg;

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!user) {
                setIsLongLoading(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [user]);

    // Debounced address search - auto-search as user types
    useEffect(() => {
        if (!addressSearchQuery || addressSearchQuery.length < 3) {
            return;
        }

        const debounceTimer = setTimeout(() => {
            handleSearchAddress();
        }, 500); // Wait 500ms after user stops typing

        return () => clearTimeout(debounceTimer);
    }, [addressSearchQuery]);

    // Clear success message after 3 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Auto-open Communities modal if coming from Find Communities button
    useEffect(() => {
        if (searchParams.get('openCommunities') === 'true') {
            setShowManage(true);
            setTimeout(() => {
                setShowCommunities(true);
            }, 100);
        }
    }, [searchParams]);

    // Handle Join Session via URL (e.g. from Invite)
    useEffect(() => {
        const joinGroupId = searchParams.get('join');
        const joinGymId = searchParams.get('gym');

        if (joinGroupId && user) {
            // Check if we are already in this session to avoid loop
            if (workoutSession && workoutSession.group_id === joinGroupId) {
                // Remove params to clean URL
                const url = new URL(window.location.href);
                url.searchParams.delete('join');
                url.searchParams.delete('gym');
                window.history.replaceState({}, '', url);
                return;
            }

            // Verify session is active before joining
            const verifyAndJoin = async () => {
                // Simple status check via Supabase directly or trust joinSession return
                // joinSession already checks for active status!
                const success = await joinSession(joinGroupId, joinGymId);
                if (success) {
                    setSuccessMessage("Joined workout session!");
                } else {
                    // Alert handled in joinSession usually, but we can prevent auto-retry
                }

                // Clean URL
                const url = new URL(window.location.href);
                url.searchParams.delete('join');
                url.searchParams.delete('gym');
                window.history.replaceState({}, '', url);
            };

            verifyAndJoin();
        }
    }, [searchParams, user, workoutSession]);



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

    // Helper to parse POINT(lng lat) string
    const parsePoint = (pointStr) => {
        if (!pointStr || typeof pointStr !== 'string') return null;
        try {
            const matches = pointStr.match(/POINT\(([-\d\.]+) ([-\d\.]+)\)/);
            if (matches && matches.length === 3) {
                return { lng: parseFloat(matches[1]), lat: parseFloat(matches[2]) };
            }
        } catch (e) {
            console.error("Error parsing POINT:", e);
        }
        return null;
    };

    // Fetch History & Participants
    const fetchHistory = async () => {
        if (!user) return;

        const { data } = await supabase
            .from('workout_sessions')
            .select('*, gyms(name)')
            .eq('user_id', user.id)
            .not('end_time', 'is', null)
            .order('start_time', { ascending: false })
            .limit(20);

        if (data) {
            // Fetch participants for group sessions individually to avoid URL length issues
            const enrichedData = await Promise.all(data.map(async (session) => {
                let matchedFriends = [];

                if (session.group_id) {
                    try {
                        // Simpler query - just get user_ids first
                        const { data: participants, error: participantsError } = await supabase
                            .from('workout_sessions')
                            .select('user_id')
                            .eq('group_id', session.group_id)
                            .neq('user_id', user.id)
                            .limit(10);

                        if (participantsError) {
                            // Only log if there's an actual error message (not just empty results)
                            if (participantsError.message) {
                                console.error("Error fetching participants for group:", session.group_id, participantsError.message);
                            }
                        } else if (participants && participants.length > 0) {
                            // Fetch profiles separately
                            const userIds = participants.map(p => p.user_id);
                            const { data: profiles } = await supabase
                                .from('profiles')
                                .select('id, name, avatar_url')
                                .in('id', userIds);

                            if (profiles) {
                                matchedFriends = profiles.map(p => ({
                                    id: p.id,
                                    name: p.name,
                                    avatar: p.avatar_url
                                }));
                            }
                        }
                    } catch (err) {
                        console.error("Exception fetching participants:", err);
                    }
                }

                return {
                    ...session,
                    matchedFriends
                };
            }));

            setHistory(enrichedData);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [user, workoutSession]);

    const handleEditSave = async (e) => {
        e.preventDefault();
        if (!editingSession) return;

        try {
            // Convert inputs to ISO strings or keep as is?
            // editingSession should have ISO.
            await updateSession(editingSession.id, {
                start_time: new Date(editingSession.start_time).toISOString(),
                end_time: new Date(editingSession.end_time).toISOString()
            });
            setEditingSession(null);
            // Refresh history handled by store or local setHistory update? 
            // store.updateSession updates 'recentSessions' in store but here we use local fetch?
            // Ideally we re-fetch or update local state.
            // Let's manually update local state for immediate feedback
            setHistory(prev => prev.map(s => s.id === editingSession.id ? { ...s, ...editingSession } : s));
            alert("Session updated");
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        setDeletingSessionId(id);
    };

    const confirmDelete = async () => {
        if (!deletingSessionId) return;
        try {
            // Optimistic update local state
            setHistory(prev => prev.filter(h => h.id !== deletingSessionId));

            await deleteSession(deletingSessionId);
            setDeletingSessionId(null);

            // Optional: Refetch to be 100% sure, but local update gives instant feedback
            // await fetchHistory(); 
        } catch (err) {
            console.error(err);
            // Store handles alert.
        }
    };

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

    const handleSearchGym = async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            // First, search existing gyms by name
            const { data: existingGyms, error } = await supabase
                .from('gyms')
                .select('id, name, address')
                .ilike('name', `%${query}%`)
                .limit(10);

            if (error) throw error;

            // Format existing gyms to match the result structure
            const formattedGyms = existingGyms?.map(gym => ({
                type: 'existing',
                id: gym.id,
                name: gym.name,
                display_name: gym.address || gym.name,
                isExisting: true
            })) || [];

            setSearchResults(formattedGyms);
        } catch (err) {
            console.error('Gym search error:', err);
            setSearchResults([]);
        }
    };

    const handleSearchAddress = async () => {
        if (!addressSearchQuery) return;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearchQuery)}`, { cache: 'no-store' });
            const data = await res.json();

            // Format address results as selectable locations
            const formattedAddresses = data.map(result => ({
                type: 'address',
                place_id: result.place_id,
                lat: result.lat,
                lng: result.lon,
                name: result.display_name,
                display_name: result.display_name,
                isExisting: false
            }));

            setSearchResults(formattedAddresses);
        } catch (err) {
            console.error('Address search error:', err);
            alert("Failed to search address");
        }
    };

    const handleCreateNewGym = () => {
        // Switch to create mode: name first, then address
        setAddMode('create');
        setSearchQuery('');
        setSearchResults([]);
        setManualLocation(null);
        setNewGymName('');
        setAddressSearchQuery('');
    };

    const handleJoinExistingGym = async (gymId, gymName) => {
        try {
            // Check if user already has this gym
            if (user.gyms?.some(g => g.id === gymId)) {
                setWarning('You already have this gym in your list!');
                return;
            }

            // Add this gym to user's gym list
            const { error } = await supabase
                .from('user_gyms')
                .insert({
                    user_id: user.id,
                    gym_id: gymId,
                    label: gymName,
                    is_default: (user.gyms?.length === 0) // Default if first
                });

            if (error) {
                console.error("Join gym error:", error);
                throw new Error(error.message || 'Failed to join gym');
            }

            // Refresh user gyms
            const { data: userGymsData } = await supabase
                .from('user_gyms')
                .select('gym_id, label, is_default, gyms(id, name, address, source, created_by, is_verified)')
                .eq('user_id', user.id);

            const gyms = userGymsData?.map(ug => ({
                id: ug.gym_id,
                name: ug.gyms?.name,
                label: ug.label,
                address: ug.gyms?.address,
                source: ug.gyms?.source,
                createdBy: ug.gyms?.created_by,
                isVerified: ug.gyms?.is_verified,
                isDefault: ug.is_default
            })) || [];

            updateUserProfile({ gyms, gymId: gyms.find(g => g.isDefault)?.id || gyms[0]?.id });

            // Reset and close
            setAddMode(false);
            setSearchQuery('');
            setSearchResults([]);

            setSuccessMessage(`Successfully joined ${gymName}!`);
        } catch (err) {
            console.error("Join gym error:", err); // Keep internal log
            setWarning(`Failed to join gym: ${err.message || 'Unknown error'}`);
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
                    }
                } catch (e) {
                    console.warn("Reverse geocode failed", e);
                }
            }

            await saveUserGym(name, lat, lng, name, finalAddress, source);

            // Refresh the gym list by reloading user data
            const { data: userGymsData } = await supabase
                .from('user_gyms')
                .select('gym_id, label, is_default, gyms(id, name, address, source, created_by, is_verified)')
                .eq('user_id', user.id);

            const gyms = userGymsData?.map(ug => ({
                id: ug.gym_id,
                name: ug.gyms?.name,
                label: ug.label,
                address: ug.gyms?.address,
                source: ug.gyms?.source,
                createdBy: ug.gyms?.created_by,
                isVerified: ug.gyms?.is_verified,
                isDefault: ug.is_default
            })) || [];

            updateUserProfile({ gyms, gymId: gyms.find(g => g.isDefault)?.id || gyms[0]?.id });

            // Reset all state and close modal
            setAddMode(false);
            setManualLocation(null);
            setSearchQuery('');
            setSearchResults([]);
            setNewGymLabel(''); // Default empty
            setNewGymName('');
            setAddressSearchQuery('');

            // Show success message
            setSuccessMessage(`Successfully added ${name}!`);
        } catch (err) {
            console.error("Failed to save gym:", err); // Keep internal log for debugging if needed, or remove as requested. User said remove console.
            // Actually user said avoid console when creating.
            setWarning(`Failed to save gym: ${err.message}`);
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

    const handleSearchCommunities = async (query) => {
        setCommunitySearchQuery(query);
        if (query.length < 2) return;

        try {
            const results = await fetchCommunities(query);
            setCommunities(results);
        } catch (err) {
            console.error(err);
        }
    };

    const handleJoinCommunityAction = async (community) => {
        if (!community.gyms) return;
        setJoiningCommunity(community.id);
        try {
            const result = await joinCommunity(community.id, community.gyms.id, community.gyms.name);
            if (result.success) {
                setSuccessMessage(`Joined ${community.name}!`);
                setShowCommunities(false);
                setShowManage(false); // Go back to tracker
            }
        } catch (err) {
            setWarning("Failed to join: " + err.message);
        } finally {
            setJoiningCommunity(null);
        }
    };

    if (showManage) {
        return (
            <div className="container" style={{ paddingBottom: '100px', paddingTop: 'calc(20px + var(--safe-top))', position: 'relative' }}>
                {showCommunities && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <div style={{
                            background: 'var(--surface)',
                            width: '100%',
                            maxWidth: '500px',
                            maxHeight: '80vh',
                            borderRadius: '16px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Find Communities</h2>
                                <button onClick={() => setShowCommunities(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                            </div>

                            <input
                                autoFocus
                                type="text"
                                placeholder="Search by gym name or city..."
                                value={communitySearchQuery}
                                onChange={(e) => handleSearchCommunities(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--background)',
                                    color: 'var(--text-main)'
                                }}
                            />

                            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                {communities.map(comm => (
                                    <div key={comm.id} style={{
                                        padding: '16px',
                                        background: 'var(--surface-highlight)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{comm.name}</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{comm.description || 'No description'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                                📍 {comm.gyms?.name || 'Unknown Gym'} • 👥 {comm.member_count || 0} members
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleJoinCommunityAction(comm)}
                                            disabled={joiningCommunity === comm.id}
                                            style={{
                                                padding: '8px 16px',
                                                background: 'var(--primary)',
                                                color: '#000',
                                                border: 'none',
                                                borderRadius: '100px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                opacity: joiningCommunity === comm.id ? 0.7 : 1
                                            }}
                                        >
                                            {joiningCommunity === comm.id ? '...' : 'Join'}
                                        </button>
                                    </div>
                                ))}
                                {communities.length === 0 && communitySearchQuery.length > 2 && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                        No communities found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                    <button onClick={() => setShowManage(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', marginRight: '16px', cursor: 'pointer', color: 'var(--text-main)' }}>←</button>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Manage Gyms</h1>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div style={{
                        padding: '16px',
                        background: 'rgba(76, 175, 80, 0.1)',
                        border: '1px solid rgb(76, 175, 80)',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        color: 'rgb(76, 175, 80)',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        animation: 'slideIn 0.3s ease'
                    }}>
                        ✓ {successMessage}
                    </div>
                )}

                {/* Warning Message */}
                {warning && (
                    <div style={{
                        padding: '16px',
                        background: 'rgba(255, 152, 0, 0.1)',
                        border: '1px solid var(--warning)',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        color: 'var(--warning)',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        animation: 'slideIn 0.3s ease'
                    }}>
                        ⚠️ {warning}
                    </div>
                )}

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
                                    {/* Settings Button (Personal & Global) */}
                                    {/* Settings Button (Personal & Global) */}
                                    <button
                                        onClick={() => setEditingSettingsGym({
                                            id: gym.id,
                                            label: gym.label || gym.name,
                                            radius: gym.radius || 200,
                                            // Global fields (for creators)
                                            isCreator: gym.createdBy === user.id,
                                            isVerified: gym.isVerified,
                                            name: gym.name,
                                            address: gym.address,
                                            location: gym.location // Pass current location string needed for updateGym
                                        })}
                                        style={{ padding: '8px', fontSize: '0.8rem', background: 'var(--surface-highlight)', color: 'var(--text-main)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                        title="Tracking Settings"
                                    >
                                        ⚙️
                                    </button>

                                    {/* Remove Button for Everyone (Leave Gym) */}
                                    <button onClick={() => {
                                        setConfirmDialog({
                                            message: `Remove "${gym.label || gym.name}" from your list?`,
                                            onConfirm: async () => {
                                                await removeUserGym(gym.id);
                                                setConfirmDialog(null);
                                            }
                                        });
                                    }} style={{ padding: '8px', fontSize: '0.8rem', background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
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

                        <button
                            onClick={() => setShowCommunities(true)}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                border: '2px solid var(--surface-highlight)',
                                background: 'transparent',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                marginTop: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>👥</span> Find Communities
                        </button>
                    </div>
                )
                }

                {
                    addMode === 'select' && (
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
                    )
                }

                {
                    editingSettingsGym && (
                        <div style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)',
                            zIndex: 10000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}>
                            <div style={{
                                background: 'var(--surface)',
                                width: '100%',
                                maxWidth: '350px',
                                borderRadius: '16px',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px'
                            }}>
                                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Gym Settings</h2>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    Settings for <strong>{editingSettingsGym.label}</strong>
                                </p>

                                <div>
                                    <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '12px' }}>Personal Settings</h3>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                        Auto-Tracking Radius: {editingSettingsGym.radius}m
                                    </label>
                                    <input
                                        type="range"
                                        min="100"
                                        max="1000"
                                        step="10"
                                        value={editingSettingsGym.radius}
                                        onChange={(e) => setEditingSettingsGym({ ...editingSettingsGym, radius: parseInt(e.target.value) })}
                                        style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--brand-yellow)' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                        <span>100m</span>
                                        <span>500m</span>
                                        <span>1km</span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                        Adjust this if auto-tracking stops while you are still at the gym. A larger radius covers more area.
                                    </p>
                                </div>

                                {editingSettingsGym.isCreator && !editingSettingsGym.isVerified && (
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '12px' }}>Gym Details (Global)</h3>

                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Gym Name</label>
                                            <input
                                                type="text"
                                                value={editingSettingsGym.name}
                                                onChange={(e) => setEditingSettingsGym({ ...editingSettingsGym, name: e.target.value })}
                                                style={{
                                                    width: '100%', padding: '10px', background: 'var(--surface-highlight)',
                                                    border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Address</label>
                                            <input
                                                type="text"
                                                value={editingSettingsGym.address || ''}
                                                onChange={(e) => setEditingSettingsGym({ ...editingSettingsGym, address: e.target.value })}
                                                style={{
                                                    width: '100%', padding: '10px', background: 'var(--surface-highlight)',
                                                    border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)'
                                                }}
                                            />
                                        </div>

                                        {/* Map Picker Toggle in Settings Modal */}
                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Location (Pin)</label>
                                                <button
                                                    onClick={() => setShowEditMap(!showEditMap)}
                                                    style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    {showEditMap ? 'Hide Map' : 'Adjust Pin on Map'}
                                                </button>
                                            </div>

                                            {showEditMap && (
                                                <div style={{ marginBottom: '16px' }}>
                                                    <MapPicker
                                                        initialLat={parsePoint(editingSettingsGym.location)?.lat || 51.1657}
                                                        initialLng={parsePoint(editingSettingsGym.location)?.lng || 10.4515}
                                                        onLocationSelect={async (lat, lng) => {
                                                            // Update local state with new location string
                                                            const newLoc = `POINT(${lng} ${lat})`;
                                                            if (editingSettingsGym.location === newLoc) return;

                                                            setEditingSettingsGym(prev => ({ ...prev, location: newLoc }));

                                                            // Reverse Geocode
                                                            try {
                                                                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                                                                const data = await res.json();
                                                                if (data && data.display_name) {
                                                                    setEditingSettingsGym(prev => ({ ...prev, address: data.display_name }));
                                                                }
                                                            } catch (e) {
                                                                console.error("Reverse geocode failed", e);
                                                            }
                                                        }}
                                                    />
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                                        Drag the marker to the exact gym entrance.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                            Changes to Name and Address affect <strong>all users</strong> of this gym.
                                        </p>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <button
                                        onClick={() => setEditingSettingsGym(null)}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: 'transparent',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            // 1. Update Personal Radius
                                            const radiusResult = await updateUserGym(editingSettingsGym.id, { radius: editingSettingsGym.radius });

                                            // 2. Update Global Details (if creator)
                                            let globalResult = { success: true };
                                            if (editingSettingsGym.isCreator) {
                                                // Parse location string back to lat/lng? updateGym expects lat/lng
                                                // editingSettingsGym.location is "POINT(lng lat)"
                                                let lat = null, lng = null;
                                                if (typeof editingSettingsGym.location === 'string') {
                                                    const matches = editingSettingsGym.location.match(/POINT\(([-\d\.]+) ([-\d\.]+)\)/);
                                                    if (matches) {
                                                        lng = parseFloat(matches[1]);
                                                        lat = parseFloat(matches[2]);
                                                    }
                                                }

                                                if (lat && lng) {
                                                    const success = await updateGym(editingSettingsGym.id, {
                                                        name: editingSettingsGym.name,
                                                        location: `POINT(${lng} ${lat})`,
                                                        address: editingSettingsGym.address
                                                    });
                                                    if (!success) globalResult = { success: false };
                                                } else {
                                                    console.error("Could not parse location for updateGym");
                                                    globalResult = { success: false };
                                                }
                                            }

                                            if (radiusResult && radiusResult.success && globalResult.success) {
                                                setSuccessMessage("Settings updated!");
                                                setEditingSettingsGym(null);
                                            } else {
                                                if (!radiusResult || !radiusResult.success) setWarningMsg("Failed to update radius.");
                                                if (!globalResult.success) setWarningMsg("Failed to update gym details.");
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: 'var(--primary)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#000',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }


                {
                    addMode === 'gps' && (
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
                    )
                }

                {
                    addMode === 'manual' && (
                        <div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="text"
                                    placeholder="Search gym by name..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleSearchGym(e.target.value);
                                    }}
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)' }}
                                />
                            </div>

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                                    {searchResults.map(result => (
                                        <div
                                            key={result.isExisting ? result.id : result.place_id}
                                            onClick={() => {
                                                if (result.isExisting) {
                                                    // Join existing gym
                                                    handleJoinExistingGym(result.id, result.name);
                                                } else {
                                                    // Select address for new gym
                                                    setManualLocation({ lat: result.lat, lng: result.lng, name: result.display_name });
                                                }
                                            }}
                                            style={{
                                                padding: '12px',
                                                background: 'var(--surface)',
                                                border: `1px solid ${result.isExisting ? 'var(--primary)' : 'var(--border)'}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-highlight)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {result.isExisting && <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>🏋️</span>}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: result.isExisting ? 'bold' : 'normal', color: result.isExisting ? 'var(--primary)' : 'var(--text-main)' }}>
                                                        {result.name || result.display_name}
                                                    </div>
                                                    {result.isExisting && result.display_name && (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{result.display_name}</div>
                                                    )}
                                                </div>
                                                {result.isExisting && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>JOIN</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* No results - offer to create new gym */}
                            {searchQuery.length >= 2 && searchResults.length === 0 && !manualLocation && (
                                <div style={{ textAlign: 'center', padding: '24px', background: 'var(--surface)', borderRadius: '8px', marginBottom: '16px' }}>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>No gyms found with that name</p>
                                    <button
                                        onClick={handleCreateNewGym}
                                        style={{ padding: '12px 24px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        Create New Gym
                                    </button>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '12px' }}>
                                        Create a new gym location
                                    </p>
                                </div>
                            )}

                            {/* Selected location - create new gym */}
                            {manualLocation && (
                                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-muted)' }}>Creating new gym at:</p>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '16px', fontWeight: 'bold' }}>{manualLocation.name}</p>
                                    <input
                                        type="text"
                                        placeholder="Gym Name (e.g. Gold's Gym)"
                                        value={newGymLabel}
                                        onChange={(e) => setNewGymLabel(e.target.value)}
                                        style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)' }}
                                    />

                                    {/* Map Picker for New Gym - Always Visible in Manual Mode */}
                                    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                📍 Location Pin
                                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                                    {manualLocation?.lat ? `${manualLocation.lat.toFixed(4)}, ${manualLocation.lng.toFixed(4)}` : 'No location set'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowSearchMap(!showSearchMap)}
                                                style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', fontWeight: 'bold' }}
                                            >
                                                {showSearchMap ? 'Hide Map' : (manualLocation ? 'Adjust Pin' : 'Set Pin on Map')}
                                            </button>
                                        </div>

                                        {showSearchMap && (
                                            <MapPicker
                                                initialLat={manualLocation?.lat || 51.1657}
                                                initialLng={manualLocation?.lng || 10.4515}
                                                onLocationSelect={(lat, lng) => {
                                                    setManualLocation(prev => ({ ...prev, lat, lng, name: prev?.name || 'Custom Location' }));
                                                }}
                                            />
                                        )}
                                    </div>


                                    <button
                                        onClick={() => handleSaveGym(newGymLabel || manualLocation.name.split(',')[0], manualLocation.lat, manualLocation.lng, manualLocation.name, 'manual')}
                                        style={{ width: '100%', padding: '16px', background: 'var(--brand-yellow)', color: '#000', border: 'none', borderRadius: '100px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}
                                    >
                                        Create & Add Gym
                                    </button>
                                </div>
                            )}
                            <button onClick={() => { setAddMode(false); setSearchQuery(''); setSearchResults([]); setManualLocation(null); }} style={{ width: '100%', marginTop: '16px', padding: '12px', background: 'none', border: 'none', color: 'var(--text-muted)' }}>Cancel</button>
                        </div>
                    )
                }

                {/* New Create Mode: Name First, Then Address */}
                {
                    addMode === 'create' && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-main)' }}>Create New Gym</h3>

                            {/* Step 1: Enter Gym Name */}
                            <input
                                type="text"
                                placeholder="Gym Name (e.g. Gold's Gym Downtown)"
                                value={newGymName}
                                onChange={(e) => setNewGymName(e.target.value)}
                                style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)' }}
                            />

                            {/* Step 2: Search for Address or Use Map */}
                            {newGymName && (
                                <>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                        <input
                                            type="text"
                                            placeholder="Search address (e.g. 123 Main St, City)"
                                            value={addressSearchQuery}
                                            onChange={(e) => setAddressSearchQuery(e.target.value)}
                                            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)' }}
                                        />
                                        <button
                                            onClick={() => {
                                                if (!manualLocation) {
                                                    setManualLocation({ lat: 51.1657, lng: 10.4515, name: 'Custom Location' });
                                                }
                                                setShowSearchMap(!showSearchMap);
                                            }}
                                            style={{ padding: '0 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: '1.2rem' }}
                                            title="Pick on Map"
                                        >
                                            🗺️
                                        </button>
                                    </div>

                                    {showSearchMap && (
                                        <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
                                            <MapPicker
                                                initialLat={Number(manualLocation?.lat || 51.1657)}
                                                initialLng={Number(manualLocation?.lng || 10.4515)}
                                                onLocationSelect={(lat, lng) => {
                                                    setManualLocation(prev => ({ ...prev, lat, lng, name: prev?.name || 'Custom Location' }));
                                                }}
                                            />
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                                                Tip: Drag the pin to your exact gym location.
                                            </p>
                                        </div>
                                    )}

                                    {addressSearchQuery.length > 0 && addressSearchQuery.length < 3 && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '-12px', marginBottom: '16px' }}>Type at least 3 characters to search...</p>
                                    )}

                                    {/* Address Search Results */}
                                    {searchResults.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                                            {searchResults.map(result => (
                                                <div
                                                    key={result.place_id}
                                                    onClick={() => {
                                                        setManualLocation({ lat: result.lat, lng: result.lng, name: result.display_name });
                                                        // Hide search map if address picked
                                                        setShowSearchMap(false);
                                                    }}
                                                    style={{ padding: '12px', background: manualLocation?.lat === result.lat ? 'var(--primary-dim)' : 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                                >
                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{result.display_name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Save Button */}
                                    {manualLocation && (
                                        <div style={{ marginTop: '16px', padding: '16px', background: 'var(--surface)', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Ready to create:</p>
                                            <p style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '4px' }}>{newGymName}</p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '16px' }}>{manualLocation.name}</p>

                                            {/* Map Picker for Refinement */}
                                            <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--background)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                        📍 Location Pin
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                                            {Number(manualLocation.lat).toFixed(4)}, {Number(manualLocation.lng).toFixed(4)}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowConfirmMap(!showConfirmMap)}
                                                        style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', fontWeight: 'bold' }}
                                                    >
                                                        {showConfirmMap ? 'Hide Map' : 'Adjust Pin'}
                                                    </button>
                                                </div>

                                                {showConfirmMap && (
                                                    <MapPicker
                                                        initialLat={manualLocation.lat}
                                                        initialLng={manualLocation.lng}
                                                        onLocationSelect={(lat, lng) => {
                                                            setManualLocation(prev => ({ ...prev, lat, lng }));
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleSaveGym(newGymName, manualLocation.lat, manualLocation.lng, manualLocation.name, 'manual')}
                                                style={{ width: '100%', padding: '16px', background: 'var(--brand-yellow)', color: '#000', border: 'none', borderRadius: '100px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}
                                            >
                                                Create & Add Gym
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            <button onClick={() => { setAddMode(false); setSearchQuery(''); setSearchResults([]); setManualLocation(null); setNewGymName(''); setAddressSearchQuery(''); }} style={{ width: '100%', marginTop: '16px', padding: '12px', background: 'none', border: 'none', color: 'var(--text-muted)' }}>Cancel</button>
                        </div>
                    )
                }


                {/* Confirmation Dialog */}
                {confirmDialog && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <div style={{
                            background: 'var(--surface)',
                            borderRadius: '16px',
                            padding: '24px',
                            maxWidth: '400px',
                            width: '100%',
                            textAlign: 'center'
                        }}>
                            <p style={{
                                fontSize: '1.1rem',
                                marginBottom: '24px',
                                color: 'var(--text-main)',
                                whiteSpace: 'pre-line'
                            }}>
                                {confirmDialog.message}
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setConfirmDialog(null)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        color: 'var(--text-main)',
                                        cursor: 'pointer',
                                        fontSize: '1rem'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDialog.onConfirm}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'var(--error)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '1rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div >
        );
    }

    return (
        <div className="container" style={{ paddingBottom: '100px', paddingTop: 'calc(40px + var(--safe-top))' }}>
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
                    {displayWarning}
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
                                Active Gym: <span style={{ color: 'var(--brand-yellow)', fontWeight: 'bold' }}>{user.gyms?.length > 0 ? (user.gyms?.find(g => g.id === user.gymId)?.label || user.gyms[0]?.label || 'None') : 'None'}</span>
                            </div>
                            {user.auto_tracking_enabled && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                    <span>🛰️</span>
                                    <span>Auto-Tracking: {status === 'tracking' ? 'Active' : status === 'denied' ? 'Permission Denied' : status === 'error' ? 'Error' : 'Initializing...'}</span>
                                </div>
                            )}
                            {currentLocation && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                                    📍 {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                                </div>
                            )}
                            {distanceToGym !== null && distanceToGym < 9000 && (
                                <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                    DISTANCE: {Math.round(distanceToGym)}m
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Actions - Only show manual controls if auto-tracking is disabled or session is manual */}
                {(!user.auto_tracking_enabled || workoutSession?.type === 'manual') && (
                    <>
                        <button
                            onClick={() => workoutSession ? stopTracking() : startTracking(user.gymId)}
                            disabled={!workoutSession && (!user.gyms || user.gyms.length === 0 || !user.gymId)}
                            style={{
                                padding: '18px 48px',
                                fontSize: '1.1rem',
                                fontWeight: '800',
                                borderRadius: '100px',
                                border: 'none',
                                background: workoutSession ? 'transparent' : ((!user.gyms || user.gyms.length === 0) ? 'var(--surface-highlight)' : 'var(--brand-yellow)'),
                                color: workoutSession ? 'var(--error)' : ((!user.gyms || user.gyms.length === 0) ? 'var(--text-dim)' : '#000'),
                                border: workoutSession ? '2px solid var(--error)' : 'none',
                                cursor: (workoutSession || (user.gyms && user.gyms.length > 0 && user.gymId)) ? 'pointer' : 'not-allowed',
                                opacity: (workoutSession || (user.gyms && user.gyms.length > 0 && user.gymId)) ? 1 : 0.5,
                                width: '100%',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                boxShadow: workoutSession ? 'none' : '0 4px 20px rgba(250, 255, 0, 0.3)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {workoutSession ? 'Stop Workout' : ((!user.gyms || user.gyms.length === 0) ? 'Add a Gym First' : 'Start Tracking')}
                        </button>

                        {/* Invite Friends Button - Only show when session is active */}
                        {workoutSession && (
                            <button
                                onClick={() => setShowInviteModal(true)}
                                style={{
                                    padding: '12px 24px',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    borderRadius: '100px',
                                    border: '1px solid var(--primary)',
                                    background: 'transparent',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    width: '100%',
                                    marginTop: '12px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                👥 Invite Friends
                            </button>
                        )}

                        {!user.gymId && (
                            <button onClick={() => setShowManage(true)} style={{ color: 'var(--brand-yellow)', fontSize: '0.9rem', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', marginTop: '8px' }}>
                                Set Home Gym Required
                            </button>
                        )}
                    </>
                )}

                {/* Auto-tracking info message */}
                {user.auto_tracking_enabled && workoutSession?.type === 'auto' && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', marginTop: '16px' }}>
                        Session will automatically stop when you leave the gym
                    </div>
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
                                    {/* Gym Location */}
                                    {session.gyms?.name && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>📍</span>
                                            <span>{session.gyms.name}</span>
                                        </div>
                                    )}
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
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => setEditingSession(session)}
                                            style={{
                                                background: 'var(--surface-highlight)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '6px',
                                                padding: '6px 12px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                color: 'var(--text-main)',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(session.id)}
                                            style={{
                                                background: 'rgba(255, 0, 0, 0.1)',
                                                border: '1px solid rgba(255, 0, 0, 0.3)',
                                                borderRadius: '6px',
                                                padding: '6px 12px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                color: 'var(--error)',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Edit Modal */}
                    {editingSession && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)', zIndex: 10000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                        }} onClick={() => setEditingSession(null)}>
                            <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                                <h3 style={{ marginBottom: '16px' }}>Edit Session</h3>
                                <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Start Time</label>
                                        <input
                                            type="datetime-local"
                                            value={new Date(editingSession.start_time).toISOString().slice(0, 16)}
                                            onChange={e => setEditingSession({ ...editingSession, start_time: new Date(e.target.value).toISOString() })}
                                            style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-muted)' }}>End Time</label>
                                        <input
                                            type="datetime-local"
                                            value={new Date(editingSession.end_time).toISOString().slice(0, 16)}
                                            onChange={e => setEditingSession({ ...editingSession, end_time: new Date(e.target.value).toISOString() })}
                                            style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                        <button type="button" onClick={() => setEditingSession(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                        <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--primary)', border: 'none', color: '#000', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}


                    {/* Invite Friend Modal */}
                    {
                        showInviteModal && (
                            <div style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.8)', zIndex: 10000,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                            }} onClick={() => setShowInviteModal(false)}>
                                <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', maxHeight: '70vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                                    <h3 style={{ marginBottom: '16px' }}>Invite Friend</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {friends && friends.length > 0 ? (
                                            friends.map(friend => (
                                                <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--background)', borderRadius: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <img src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                                        <span style={{ fontWeight: 'bold' }}>{friend.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            const success = await inviteToSession(friend.id);
                                                            if (success) {
                                                                alert(`Invited ${friend.name}!`);
                                                                setShowInviteModal(false);
                                                            } else {
                                                                alert("Failed to invite.");
                                                            }
                                                        }}
                                                        style={{ padding: '8px 16px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '100px', fontWeight: 'bold', cursor: 'pointer' }}
                                                    >
                                                        Invite
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                                No friends found. Add friends in the Social tab!
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setShowInviteModal(false)} style={{ width: '100%', padding: '12px', marginTop: '16px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
                                </div>
                            </div>
                        )
                    }

                    {/* Delete Confirmation Modal */}
                    {deletingSessionId && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)', zIndex: 10000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                        }} onClick={() => setDeletingSessionId(null)}>
                            <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '350px' }} onClick={e => e.stopPropagation()}>
                                <h3 style={{ marginBottom: '16px', color: 'var(--error)' }}>Delete Session?</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                                    This cannot be undone. Are you sure?
                                </p>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setDeletingSessionId(null)}
                                        style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        style={{ flex: 1, padding: '12px', background: 'var(--error)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </section >
            )}

            {/* Invite Friends Modal */}
            {showInviteModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }} onClick={() => setShowInviteModal(false)}>
                    <div style={{
                        background: 'var(--surface)',
                        padding: '24px',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '400px',
                        maxHeight: '80vh',
                        overflowY: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '16px', fontSize: '1.3rem' }}>Invite Friends</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
                            Select friends to invite to your workout session
                        </p>

                        {friends && friends.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {friends.map(friend => (
                                    <div
                                        key={friend.id}
                                        onClick={async () => {
                                            const success = await inviteToSession(friend.id, workoutSession?.id);
                                            setShowInviteModal(false);
                                            if (success) {
                                                setSuccessMessage(`Invite sent to ${friend.name}!`);
                                            } else {
                                                alert("Failed to send invite");
                                            }
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            background: 'var(--background)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            border: '1px solid var(--border)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <img
                                            src={friend.avatar || '/default-avatar.png'}
                                            alt={friend.name}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600' }}>{friend.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Tap to invite
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                No friends yet. Add friends to invite them!
                            </div>
                        )}

                        <button
                            onClick={() => setShowInviteModal(false)}
                            style={{
                                width: '100%',
                                marginTop: '20px',
                                padding: '12px',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                color: 'var(--text-main)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            {confirmDialog && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--surface)',
                        borderRadius: '16px',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '100%',
                        textAlign: 'center'
                    }}>
                        <p style={{
                            fontSize: '1.1rem',
                            marginBottom: '24px',
                            color: 'var(--text-main)',
                            whiteSpace: 'pre-line'
                        }}>
                            {confirmDialog.message}
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setConfirmDialog(null)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    fontSize: '1rem'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDialog.onConfirm}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'var(--error)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div >
    );
}

import ErrorBoundary from '@/components/ErrorBoundary';

export default function TrackerPage() {
    return (
        <ErrorBoundary message="Tracker unavailable">
            <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Tracker...</div>}>
                <TrackerContent />
            </Suspense>
        </ErrorBoundary>
    );
}
