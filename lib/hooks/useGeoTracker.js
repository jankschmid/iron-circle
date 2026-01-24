import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';

// Helper: Haversine Distance (meters)
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d * 1000; // meters
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

export function useGeoTracker() {
    const { user, workoutSession, setWorkoutSession } = useStore();
    const [status, setStatus] = useState('idle'); // idle, tracking, error
    const [currentLocation, setCurrentLocation] = useState(null);
    const [distanceToGym, setDistanceToGym] = useState(null);
    const [isAtGym, setIsAtGym] = useState(false);
    const [warning, setWarning] = useState(null);
    const hasWarnedRef = useRef(false);

    // Safety Net: Max 4 hours + Warning
    useEffect(() => {
        if (workoutSession?.start_time && workoutSession.status === 'active') {
            const checkTime = () => {
                const now = new Date();
                const start = new Date(workoutSession.start_time);
                const diffMinutes = (now - start) / 1000 / 60; // minutes

                // 30 Second Warning (TEST MODE)
                if (diffMinutes >= 0.5 && diffMinutes < 1 && !hasWarnedRef.current) {
                    hasWarnedRef.current = true;
                    setWarning("Still training? Your session will end in 30 seconds (TEST MODE).");
                    if (Notification.permission === 'granted') {
                        new Notification("Gym Tracker", {
                            body: "Still training? Your session will end in 30 seconds (TEST MODE).",
                            icon: '/icons/warning.png'
                        });
                    }
                }

                // 1 Minute Timeout (TEST MODE)
                if (diffMinutes >= 1) {
                    stopTracking('timeout');
                }
            };

            const interval = setInterval(checkTime, 5000); // Check every 5s
            checkTime(); // check immediately
            return () => clearInterval(interval);
        } else {
            hasWarnedRef.current = false;
            setWarning(null);
        }
    }, [workoutSession]);

    const supabase = createClient();
    const watchId = useRef(null);

    // Initial Request Permission & Start Watch
    useEffect(() => {
        if (!user?.auto_tracking_enabled && !workoutSession) return;

        // Request notification permission immediately if auto-tracking is on
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }

        if (!navigator.geolocation) {
            setStatus('error');
            return;
        }

        watchId.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentLocation({ lat: latitude, lng: longitude });
                setStatus('tracking');
                checkGeofence(latitude, longitude);
            },
            (error) => {
                console.error("Geo Error Code:", error.code, "Message:", error.message);
                let msg = 'error';
                if (error.code === 1) msg = 'denied';
                if (error.code === 2) msg = 'unavailable';
                if (error.code === 3) msg = 'timeout';
                setStatus(msg);
                setWarning(`Location Error: ${error.message} (Code ${error.code})`);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
        );

        return () => {
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
        };
    }, [user?.auto_tracking_enabled, workoutSession]);

    const checkGeofence = async (lat, lng) => {
        const gyms = user?.gyms || [];
        // Fallback for legacy
        if (gyms.length === 0 && user?.gymId) {
            gyms.push({ id: user.gymId, name: 'Home Gym', location: null }); // location null implies we need to fetch it? 
            // Actually store now fetches location for user.gyms
            // If fallback, we might not have location in object if we didn't fetch it.
            // But we can use the `get_gyms_nearby` RPC to find matches regardless of user list if we trust RPC?
            // "within a 100m circle"
        }

        if (gyms.length === 0) return;

        // We can optimize by checking client-side distance first if we have locations
        // Or just use the RPC which is robust? RPC `get_gyms_nearby` finds ANY gym.
        // We only want USER gyms.

        let nearestGym = null;
        let minDist = 99999;

        // Client-side check if we have locations loaded (we do in new Store)
        let foundInside = false;

        for (const gym of gyms) {
            if (!gym.location) continue; // Skip if missing location data

            // PostGIS point is lon/lat usually. gym.location might be object or string?
            // Supabase returns GeoJSON formatted object or WKT?
            // Standard PostGIS select returns GeoJSON object usually if cast, or WKB.
            // Wait, migration 1 definition: geography(POINT, 4326). Supabase JS client returns GeoJSON: { type: "Point", coordinates: [lng, lat] }

            let gLat, gLng;
            if (typeof gym.location === 'string') {
                // Handle WKT: POINT(lng lat)
                const matches = gym.location.match(/POINT\(([-\d\.]+) ([-\d\.]+)\)/);
                if (matches) {
                    gLng = parseFloat(matches[1]);
                    gLat = parseFloat(matches[2]);
                }
            } else if (gym.location?.coordinates) {
                [gLng, gLat] = gym.location.coordinates;
            }

            if (!gLat || !gLng) continue;

            const dist = getDistanceFromLatLonInM(lat, lng, gLat, gLng);

            if (dist < minDist) {
                minDist = dist;
                nearestGym = { ...gym, dist_meters: dist };
            }
        }

        setDistanceToGym(minDist); // Show nearest

        if (nearestGym) {
            const isInside = nearestGym.dist_meters <= 100; // 100m radius as requested
            const isOutside = nearestGym.dist_meters > 150; // Hysteresis

            setIsAtGym(isInside);

            if (user.auto_tracking_enabled) {
                if (isInside) {
                    // Check if already tracking THIS gym
                    if (workoutSession && workoutSession.gym_id === nearestGym.id) {
                        // Already tracking this one, do nothing
                    } else if (!workoutSession) {
                        // Start new
                        startTracking(nearestGym.id, 'auto', nearestGym.name);
                    } else if (workoutSession && workoutSession.type === 'auto') {
                        // Tracking another gym automatically? Switch?
                        // For now, let's stop the other first if we moved fast? 
                        // Or just ignore. Usually you leave one before entering another.
                    }
                } else if (isOutside && workoutSession && workoutSession.type === 'auto') {
                    // Check if we are leaving the gym we are tracking
                    if (workoutSession.gym_id === nearestGym.id) {
                        stopTracking('auto-leave');
                    }
                    // What if we are tracking Gym A, but now Gym B is nearest (but far)? 
                    // We should check distance to the TRACKED gym specifically to stop it.
                }
            }
        } else {
            setIsAtGym(false);
            // If we have a session but no nearest gym found (weird), or nearest is far
            if (user.auto_tracking_enabled && workoutSession && workoutSession.type === 'auto') {
                // We need to calculate distance to the current session's gym to be sure?
                // or just rely on the fact that we are far from ALL user gyms
                stopTracking('auto-leave');
            }
        }
    };

    const startTracking = async (gymId, type = 'manual', gymName = null) => {
        // Explicitly request permission on manual start
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            await Notification.requestPermission();
        }

        const startTime = new Date().toISOString();

        // DB Insert
        const { data: session, error } = await supabase
            .from('workout_sessions')
            .insert({
                user_id: user.id,
                gym_id: gymId,
                start_time: startTime,
                status: 'active',
                type
            })
            .select('*, gyms(name)') // Fetch name join
            .single();

        if (error) {
            console.error("Start Session Error:", error);
            return;
        }

        setWorkoutSession(session);

        // Notification
        if (Notification.permission === 'granted') {
            const body = gymName
                ? `You are at ${gymName}. Your workout session has started!`
                : `Workout started! (${type})`;
            new Notification("Gym Tracker", { body });
        }
    };

    const stopTracking = async (reason = 'manual') => {
        if (!workoutSession) return;

        const endTime = new Date().toISOString();
        const duration = Math.round((new Date(endTime) - new Date(workoutSession.start_time)) / 1000);

        let status = 'completed';
        if (reason === 'timeout' || reason === 'auto-timeout') status = 'timeout';

        const { error } = await supabase
            .from('workout_sessions')
            .update({
                end_time: endTime,
                duration,
                status: status
            })
            .eq('id', workoutSession.id);

        if (error) {
            console.error("Stop Session Error:", error);
            return;
        }

        setWorkoutSession(null);

        if (Notification.permission === 'granted') {
            const msg = status === 'timeout'
                ? "Session auto-closed (4h limit reached)."
                : `Workout finished! Duration: ${Math.round(duration / 60)}m`;
            new Notification("Gym Tracker", { body: msg });
        }
    };

    return {
        status,
        currentLocation,
        distanceToGym,
        isAtGym,
        workoutSession,
        startTracking,
        stopTracking,
        warning
    };
}
