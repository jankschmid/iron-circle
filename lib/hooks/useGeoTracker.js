import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Geolocation } from '@capacitor/geolocation';

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

        let isMounted = true;

        const startWatch = async () => {
            if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
                try {
                    const permStart = await Geolocation.checkPermissions();
                    if (permStart.location !== 'granted') {
                        const requested = await Geolocation.requestPermissions();
                        if (requested.location !== 'granted') {
                            if (isMounted) {
                                setStatus('denied');
                                setWarning('Location permission denied.');
                            }
                            return;
                        }
                    }
                } catch (e) {
                    console.error('Failed to request location permissions', e);
                }
            } else if (!navigator.geolocation) {
                if (isMounted) setStatus('error');
                return;
            }

            try {
                watchId.current = await Geolocation.watchPosition(
                    { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
                    (position, error) => {
                        if (!isMounted) return;
                        if (error) {
                            if (!user?.auto_tracking_enabled || (workoutSession && workoutSession.type === 'manual')) {
                                console.warn("GPS Error (ignored for manual session):", error.message);
                                setStatus('idle');
                                return;
                            }
                            console.warn("Geo Error:", error);
                            setStatus('error');
                            setWarning(`Location Error: ${error.message || 'Unknown'}`);
                            return;
                        }
                        if (position) {
                            const { latitude, longitude } = position.coords;
                            setCurrentLocation({ lat: latitude, lng: longitude });
                            setStatus('tracking');
                            checkGeofence(latitude, longitude);
                        }
                    }
                );
            } catch (err) {
                console.error("Error starting watchPosition", err);
            }
        };

        startWatch();

        return () => {
            isMounted = false;
            if (watchId.current) {
                // Capacitor Geolocation watchId is a string, navigator is a number
                if (typeof watchId.current === 'string') {
                    Geolocation.clearWatch({ id: watchId.current }).catch(console.error);
                } else if (navigator.geolocation) {
                    navigator.geolocation.clearWatch(watchId.current);
                }
            }
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
                        // Check if this gym is currently suppressed due to a manual stop
                        const suppressedGymId = sessionStorage.getItem('suppressedGymId');
                        if (suppressedGymId === nearestGym.id) {
                            console.log('[GeoTracker] Auto-start suppressed for', nearestGym.name, 'due to recent manual stop.');
                        } else {
                            // Start new
                            console.log('[GeoTracker] Auto-starting session at', nearestGym.label || nearestGym.name);
                            startTrackingSession(nearestGym.id, 'auto', nearestGym.name);
                        }
                    }
                } else if (isOutside) {
                    // If we are outside, clear any suppression for this gym
                    const suppressedGymId = sessionStorage.getItem('suppressedGymId');
                    if (suppressedGymId === nearestGym.id) {
                        console.log('[GeoTracker] Left suppressed gym, clearing suppression.');
                        sessionStorage.removeItem('suppressedGymId');
                    }

                    if (workoutSession && workoutSession.type === 'auto') {
                        // Check if we are leaving the gym we are tracking
                        if (workoutSession.gym_id === nearestGym.id) {
                            console.log('[GeoTracker] Auto-stopping session (left gym)');
                            stopTrackingSession('auto-leave');
                        }
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
