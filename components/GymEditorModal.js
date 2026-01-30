"use client";
import { useState, useRef, useEffect } from "react";
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
                    <input
                        required
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#333', border: 'none', color: '#fff' }}
                        placeholder="e.g. Musterstraße 1, Berlin"
                    />
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Exact Location</label>
                    <MapPicker
                        initialLat={lat}
                        initialLng={lng}
                        onLocationSelect={(newLat, newLng) => {
                            setLat(newLat);
                            setLng(newLng);
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
            </form>
        </div>
    );
}
