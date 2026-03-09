"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import toast from 'react-hot-toast';
// Dynamic import for Leaflet map to avoid SSR issues
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
    ssr: false,
    loading: () => <div style={{ height: '300px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>
});

export default function GymEditorModal({ gym = null, onClose, onSave }) {
    const [name, setName] = useState(gym?.name || '');
    const [address, setAddress] = useState(gym?.address || '');
    // Parse location if exists (POINT(lng lat)) or default
    const getCoords = (locStr) => {
        if (!locStr) return { lat: 51.1657, lng: 10.4515 }; // Germany center default
        try {
            const matches = locStr.match(/POINT\(([-.\d]+)\s+([-.\d]+)\)/);
            if (matches) return { lng: parseFloat(matches[1]), lat: parseFloat(matches[2]) };
        } catch (e) {
            console.error("Parse Error", e);
        }
        return { lat: 51.1657, lng: 10.4515 };
    };

    const initialCoords = getCoords(gym?.location);
    const [lat, setLat] = useState(initialCoords.lat);
    const [lng, setLng] = useState(initialCoords.lng);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Track coords we just set via "Find" so we don't immediately reverse-geocode them back in a loop
    const lastGeocodedCoords = useRef(null);

    const supabase = createClient(); // Added this line

    const handleGeocode = async () => {
        if (!address.trim()) return;
        setIsGeocoding(true);
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&email=contact@ironcircle.app`;
            const res = await fetch(url);

            if (!res.ok) {
                if (res.status === 429) throw new Error("Rate limit exceeded. Try again in a moment.");
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            if (data && data.length > 0) {
                const newLat = parseFloat(data[0].lat);
                const newLng = parseFloat(data[0].lon);
                lastGeocodedCoords.current = { lat: newLat, lng: newLng };
                setLat(newLat);
                setLng(newLng);
            } else {
                toast.error("Address not found. Please place the pin manually.");
            }
        } catch (e) {
            console.error("Geocoding failed", e);
            toast.error(e.message || "Error locating address");
        }
        setIsGeocoding(false);
    };

    const handleReverseGeocode = async (revLat, revLng) => {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${revLat}&lon=${revLng}&email=contact@ironcircle.app`;
            const res = await fetch(url);

            if (!res.ok) {
                if (res.status === 429) console.warn("Reverse geocode rate limit exceeded.");
                return;
            }

            const data = await res.json();

            if (data && data.display_name) {
                // Try to format it nicely, otherwise use display_name
                let newAddress = data.display_name;
                if (data.address) {
                    const city = data.address.city || data.address.town || data.address.village;
                    const street = data.address.road;
                    const houseNumber = data.address.house_number;
                    if (city && street) {
                        newAddress = `${street} ${houseNumber ? houseNumber + ', ' : ', '}${city}`;
                    }
                }
                setAddress(newAddress);
            }
        } catch (e) {
            console.error("Reverse Geocoding failed", e);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            id: gym?.id,
            name,
            address,
            location: `POINT(${lng} ${lat})`
        });
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <form onSubmit={handleSubmit} style={{
                background: '#1a1a1a', padding: '24px', borderRadius: '16px',
                width: '100%', maxWidth: '500px', border: '1px solid #333',
                color: '#fff', maxHeight: '90vh', overflowY: 'auto'
            }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem' }}>{gym ? 'Edit Gym' : 'New Partner Gym'}</h2>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Gym Name</label>
                    <input
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#333', border: 'none', color: '#fff' }}
                        placeholder="e.g. Iron Paradise"
                    />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Address (City/Street)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            required
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            onBlur={handleGeocode}
                            style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#333', border: 'none', color: '#fff' }}
                            placeholder="e.g. Musterstraße 1, Berlin"
                        />
                        <button
                            type="button"
                            onClick={handleGeocode}
                            disabled={isGeocoding}
                            style={{ padding: '0 16px', borderRadius: '8px', background: '#444', border: '1px solid #555', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            {isGeocoding ? '...' : '📍 Find'}
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Exact Location</label>
                    <MapPicker
                        initialLat={lat}
                        initialLng={lng}
                        onLocationSelect={(newLat, newLng) => {
                            setLat(newLat);
                            setLng(newLng);

                            // Only reverse geocode if this pin movement wasn't just caused by the 'Find' button
                            if (!lastGeocodedCoords.current ||
                                Math.abs(lastGeocodedCoords.current.lat - newLat) > 0.0001 ||
                                Math.abs(lastGeocodedCoords.current.lng - newLng) > 0.0001) {
                                handleReverseGeocode(newLat, newLng);
                                lastGeocodedCoords.current = null; // Reset tracker
                            }
                        }}
                    />
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                        Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ padding: '12px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid #555', color: '#fff', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        style={{ padding: '12px 20px', borderRadius: '8px', background: '#FFC800', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        {gym ? 'Top Up / Save' : 'Create Gym'}
                    </button>
                </div>
            </form >
        </div >
    );
}
