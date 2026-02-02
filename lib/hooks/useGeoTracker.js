import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';

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
    const { user, workoutSession, startTrackingSession, stopTrackingSession } = useStore();
    const [status, setStatus] = useState('idle'); // idle, tracking, error
    const [currentLocation, setCurrentLocation] = useState(null);
    const [distanceToGym, setDistanceToGym] = useState(null);
    const [isAtGym, setIsAtGym] = useState(false);
    const [warning, setWarning] = useState(null);

    // Note: Global timer/janitor is now in store.js

    const watchId = useRef(null);

    // Initial Request Permission & Start Watch
    useEffect(() => {
        if (!user?.auto_tracking_enabled && !workoutSession) return;

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
                // Suppress warning if manual session or auto-tracking disabled (user just started manual)
                if (error.code === 1) { // Denied or Insecure Origin
                    if (!user?.auto_tracking_enabled || (workoutSession && workoutSession.type === 'manual')) {
                        console.warn("GPS Denied/Insecure (ignored for manual session):", error.message);
                        setStatus('idle'); // Treat as idle/manual mode
                        return;
                    }
                }

                console.warn("Geo Error:", error.code, error.message); // Warn only, don't crash UI

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.auto_tracking_enabled, workoutSession]);

    const checkGeofence = async (lat, lng) => {
        const gyms = user?.gyms || [];
        // Removed console.log spam

        if (gyms.length === 0) return;

        let nearestGym = null;
        let minDist = 99999;

        for (const gym of gyms) {
            if (!gym.location) continue;
            let gLat, gLng;

            // Parse Location
            if (typeof gym.location === 'string') {
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
            // Use custom radius if set, or default to 200m (user requested larger default than 100)
            const radius = nearestGym.radius || 200;
            const isInside = nearestGym.dist_meters <= radius;
            const isOutside = nearestGym.dist_meters > (radius + 50); // Hysteresis

            setIsAtGym(isInside);

            if (user.auto_tracking_enabled) {
                if (isInside) {
                    // Check if already tracking THIS gym
                    if (workoutSession && workoutSession.gym_id === nearestGym.id) {
                        // Already tracking this one, do nothing
                    } else if (!workoutSession) {
                        // Start new
                        console.log('[GeoTracker] Auto-starting session at', nearestGym.label || nearestGym.name);
                        startTrackingSession(nearestGym.id, 'auto', nearestGym.name);
                    }
                } else if (isOutside && workoutSession && workoutSession.type === 'auto') {
                    // Check if we are leaving the gym we are tracking
                    if (workoutSession.gym_id === nearestGym.id) {
                        console.log('[GeoTracker] Auto-stopping session (left gym)');
                        stopTrackingSession('auto-leave');
                    }
                }
            }
        } else {
            setIsAtGym(false);
            // If we have a session but no nearest gym found (weird), or nearest is far
            if (user.auto_tracking_enabled && workoutSession && workoutSession.type === 'auto') {
                // We need to calculate distance to the current session's gym to be sure?
                // or just rely on the fact that we are far from ALL user gyms
                console.log('[GeoTracker] No gyms nearby, auto-stopping session');
                stopTrackingSession('auto-leave');
            }
        }
    };

    return {
        status,
        currentLocation,
        distanceToGym,
        isAtGym,
        workoutSession,
        startTracking: startTrackingSession, // Delegate to store
        stopTracking: stopTrackingSession,   // Delegate to store
        warning
    };
}
