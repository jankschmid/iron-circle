'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon
// This is necessary because Next.js/Webpack can mess up the default icon paths
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
    const markerRef = useRef(null);

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    setPosition(marker.getLatLng());
                }
            },
        }),
        [setPosition],
    );

    return position === null ? null : (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        >
            <Popup>You are here. Drag to adjust.</Popup>
        </Marker>
    );
}

// Helper to center map on coordinates change
function ChangeView({ center }) {
    const map = useMapEvents({});
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

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
            <MapContainer
                center={position}
                zoom={hasInitial ? 16 : 5}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={position} setPosition={setPosition} />
                <ChangeView center={position} />
            </MapContainer>
        </div>
    );
};

export default MapPicker;
