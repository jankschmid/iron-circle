"use client";

import { createContext, useContext } from 'react';
import { useGeoTracker } from '@/lib/hooks/useGeoTracker';

const GeoTrackerContext = createContext(null);

export function GlobalTrackerProvider({ children }) {
    // Run the hook once at the root level
    const trackerState = useGeoTracker();

    return (
        <GeoTrackerContext.Provider value={trackerState}>
            {children}
        </GeoTrackerContext.Provider>
    );
}

// Custom hook to consume the global tracking state
export function useGlobalGeoTracker() {
    const context = useContext(GeoTrackerContext);
    if (!context) {
        throw new Error("useGlobalGeoTracker must be used within a GlobalTrackerProvider");
    }
    return context;
}
