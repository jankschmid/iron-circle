'use client';
import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the Map component with SSR disabled
const MapPickerMap = dynamic(() => import('./MapPickerMap'), {
    ssr: false,
    loading: () => <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee', color: '#666' }}>Loading Map...</div>
});

const MapPicker = ({ initialLat, initialLng, onLocationSelect }) => {
    // Default to Europe/Central if nothing provided (e.g. 50, 10) or user location
    const [position, setPosition] = useState(
        (initialLat && initialLng) ? { lat: initialLat, lng: initialLng } : { lat: 50.0, lng: 10.0 }
    );

    // Track if we have a "real" initial position to zoom in
    const hasInitial = !!(initialLat && initialLng);

    // Track previous position to avoid infinite loops if generic object equality fails
    const prevPosRef = useRef(position);

    // Update parent when position changes, but only if it ACTUALLY changed
    useEffect(() => {
        if (position && onLocationSelect) {
            const prev = prevPosRef.current;
            if (prev.lat !== position.lat || prev.lng !== position.lng) {
                onLocationSelect(position.lat, position.lng);
                prevPosRef.current = position;
            }
        }
    }, [position, onLocationSelect]);

    return (
        <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--border)' }}>
            <MapPickerMap position={position} setPosition={setPosition} hasInitial={hasInitial} />
        </div>
    );
};

export default MapPicker;
