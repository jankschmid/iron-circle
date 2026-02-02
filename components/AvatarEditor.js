"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- DICEBEAR OPTIONS DICTIONARY (VERIFIED DICEBEAR V9 SCHEMA) ---
const OPTIONS = {
    top: [
        { value: 'bigHair', label: 'Big Hair' },
        { value: 'bob', label: 'Bob' },
        { value: 'bun', label: 'Bun' },
        { value: 'curly', label: 'Curly' },
        { value: 'curvy', label: 'Curvy' },
        { value: 'dreads', label: 'Dreads' },
        { value: 'frida', label: 'Frida' },
        { value: 'fro', label: 'Fro' },
        { value: 'froBand', label: 'Fro Band' },
        { value: 'hat', label: 'Hat' },
        { value: 'hijab', label: 'Hijab' },
        { value: 'longButNotTooLong', label: 'Not Too Long' },
        { value: 'miaWallace', label: 'Mia Wallace' },
        { value: 'shavedSides', label: 'Shaved Sides' },
        { value: 'straight01', label: 'Straight 1' },
        { value: 'straight02', label: 'Straight 2' },
        { value: 'straightAndStrand', label: 'Straight & Strand' },
        { value: 'dreads01', label: 'Dreads Short' },
        { value: 'dreads02', label: 'Dreads Short 2' },
        { value: 'frizzle', label: 'Frizzle' },
        { value: 'shaggy', label: 'Shaggy' },
        { value: 'shaggyMullet', label: 'Mullet' },
        { value: 'shortCurly', label: 'Short Curly' },
        { value: 'shortFlat', label: 'Short Flat' },
        { value: 'shortRound', label: 'Short Round' },
        { value: 'shortWaved', label: 'Short Waved' },
        { value: 'sides', label: 'Sides' },
        { value: 'theCaesar', label: 'Caesar' },
        { value: 'theCaesarAndSidePart', label: 'Caesar Side Part' },
        { value: 'turban', label: 'Turban' },
        { value: 'winterHat1', label: 'Winter Hat 1' },
        { value: 'winterHat02', label: 'Winter Hat 2' },
        { value: 'winterHat03', label: 'Winter Hat 3' },
        { value: 'winterHat04', label: 'Winter Hat 4' }
    ],
    accessories: [
        'none', 'eyepatch', 'kurt', 'prescription01', 'prescription02',
        'round', 'sunglasses', 'wayfarers'
    ],
    accessoriesColor: [
        '262e33', '65c9ff', '5199e4', '25557c', 'e6e6e6', '929598', '3c4f5c',
        'b1e2ff', 'a7ffc4', 'ffafb9', 'ffffb1', 'ff488e', 'ff5c5c', 'ffffff'
    ],
    hatColor: [
        '262e33', '65c9ff', '5199e4', '25557c', 'e6e6e6', '929598', '3c4f5c',
        'b1e2ff', 'a7ffc4', 'ffafb9', 'ffffb1', 'ff488e', 'ff5c5c', 'ffffff'
    ],
    hairColor: [
        'A55728', '2C1B18', 'B58143', 'D6B370', '724133', '4A312C',
        'F59797', 'ECDCBF', 'C93305', 'E8E1E1'
    ],
    facialHair: [
        'none', 'beardMedium', 'beardLight', 'beardMajestic', 'moustacheFancy', 'moustacheMagnum'
    ],
    facialHairColor: [
        'A55728', '2C1B18', 'B58143', 'D6B370', '724133', '4A312C',
        'F59797', 'ECDCBF', 'C93305', 'E8E1E1'
    ],
    clothing: [
        'blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt',
        'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'
    ],
    clothesColor: [
        '3c4f5c', '65c9ff', '262e33', 'ff5c5c', '5199e4', '25557c', 'e6e6e6',
        '929598', 'b1e2ff', 'a7ffc4', 'ffafb9', 'ffffb1', 'ff488e', 'ffffff'
    ],
    eyes: [
        'default', 'closed', 'cry', 'xDizzy', 'eyeRoll', 'happy', 'hearts',
        'side', 'squint', 'surprised', 'wink', 'winkWacky'
    ],
    eyebrows: [
        'default', 'angry', 'angryNatural', 'flatNatural', 'frownNatural',
        'raisedExcited', 'sadConcerned', 'unibrowNatural', 'upDown'
    ],
    mouth: [
        'default', 'concerned', 'disbelief', 'eating', 'grimace', 'sad',
        'screamOpen', 'serious', 'smile', 'tongue', 'twinkle', 'vomit'
    ],
    skinColor: [
        'EDB98A', 'FD9841', 'F8D25C', 'FFDBB4', 'D08B5B', 'AE5D29', '614335'
    ]
};

// --- TABS CONFIG ---
const TABS = [
    { id: 'head', label: 'Head', icon: '💇', fields: ['top', 'hairColor', 'hatColor', 'accessories', 'accessoriesColor'] },
    { id: 'face', label: 'Face', icon: '😄', fields: ['eyes', 'eyebrows', 'mouth', 'facialHair', 'facialHairColor', 'skinColor'] },
    { id: 'style', label: 'Style', icon: '👕', fields: ['clothing', 'clothesColor'] }
];

export default function AvatarEditor({ initialUrl, onSave, onCancel }) {
    const [config, setConfig] = useState({
        top: 'shortFlat',
        hatColor: '262e33',
        accessories: 'none',
        accessoriesColor: '262e33',
        hairColor: '724133',
        facialHair: 'none',
        facialHairColor: '724133',
        clothing: 'blazerAndShirt',
        clothesColor: '3c4f5c',
        eyes: 'default',
        eyebrows: 'default',
        mouth: 'default',
        skinColor: 'EDB98A'
    });

    const [activeTab, setActiveTab] = useState('head');
    const [previewUrl, setPreviewUrl] = useState('');

    // Robust URL Builder for DiceBear v9
    const buildAvatarUrl = (currentConfig) => {
        const baseUrl = "https://api.dicebear.com/9.x/avataaars/svg";
        const params = new URLSearchParams();

        // 1. Statische Werte immer setzen
        params.append('seed', 'Felix');
        // FIX: Accessories Probability Logic
        // Wenn 'none' gewählt ist -> Probability 0, sonst 100
        params.append('accessoriesProbability', currentConfig.accessories === 'none' ? '0' : '100');

        // FIX: Facial Hair Probability Logic
        params.append('facialHairProbability', currentConfig.facialHair === 'none' ? '0' : '100');

        // Strictly validate 'top' against allowed values
        let validTop = currentConfig.top;
        // Check if top value exists in valid options (values)
        // Note: OPTIONS.top is now an Object Array, others are String Arrays
        const validTopValues = OPTIONS.top.map(o => o.value);

        if (!validTopValues.includes(validTop)) {
            console.warn(`Invalid top value '${validTop}', falling back to 'shortFlat'`);
            validTop = 'shortFlat';
        }

        // 2. Map aller möglichen Optionen aus dem State
        const options = {
            top: validTop,
            hatColor: currentConfig.hatColor ? currentConfig.hatColor.replace('#', '') : null,
            accessories: currentConfig.accessories,
            accessoriesColor: currentConfig.accessoriesColor ? currentConfig.accessoriesColor.replace('#', '') : null,
            facialHair: currentConfig.facialHair,
            facialHairColor: currentConfig.facialHairColor ? currentConfig.facialHairColor.replace('#', '') : null,
            clothing: currentConfig.clothing,
            clothesColor: currentConfig.clothesColor ? currentConfig.clothesColor.replace('#', '') : null,
            eyes: currentConfig.eyes,
            eyebrows: currentConfig.eyebrows,
            mouth: currentConfig.mouth,
            hairColor: currentConfig.hairColor ? currentConfig.hairColor.replace('#', '') : null,
            skinColor: currentConfig.skinColor ? currentConfig.skinColor.replace('#', '') : null
        };

        // 3. Strikte Filter-Schleife
        Object.entries(options).forEach(([key, value]) => {
            // Prüfen, ob Wert existiert UND nicht 'none'/'default' ist
            // Ausnahme: 'default' bei eyes/mouth etc. ist okay.
            // DiceBear 'none' ist okay für Arrays wie accessories, aber wir steuern das über Probability.
            // Daher 'none' hier filtern.
            if (value && value !== 'none' && value !== 'default') {
                params.append(key, value);
            }
        });

        return `${baseUrl}?${params.toString()}`;
    };

    // Update Preview URL whenever config changes
    useEffect(() => {
        setPreviewUrl(buildAvatarUrl(config));
    }, [config]);

    // Initialize on mount
    useEffect(() => {
        setPreviewUrl(buildAvatarUrl(config));
    }, []);

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                    background: 'var(--surface)', width: '100%', maxWidth: '420px',
                    borderRadius: '24px', border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden'
                }}
            >
                {/* HEADER */}
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Avatar Studio</h2>
                    <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                {/* PREVIEW */}
                <div style={{ padding: '24px', background: 'var(--surface-highlight)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {previewUrl && (
                        <img
                            src={previewUrl}
                            onError={(e) => {
                                console.error("Avatar Load Error:", e);
                                e.target.style.border = '4px solid red';
                            }}
                            style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--primary)', background: '#f0f0f0' }}
                        />
                    )}
                    <details style={{ marginTop: '8px', maxWidth: '300px' }}>
                        <summary style={{ fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Debug URL</summary>
                        <p style={{ fontSize: '0.6rem', wordBreak: 'break-all', color: 'var(--text-muted)' }}>{previewUrl}</p>
                    </details>
                </div>

                {/* TABS */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1, padding: '16px', background: activeTab === tab.id ? 'var(--surface)' : 'rgba(0,0,0,0.2)',
                                border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer',
                                transition: '0.2s'
                            }}
                        >
                            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* CONTROLS */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    {TABS.find(t => t.id === activeTab).fields.map(field => (
                        <div key={field} style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'capitalize', fontSize: '0.9rem' }}>
                                {field.replace(/([A-Z])/g, ' $1').trim()}
                            </label>

                            {/* Color Swatches or Option Grid */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {OPTIONS[field].map(opt => {
                                    // Handle Object vs String options
                                    const isObject = typeof opt === 'object';
                                    const value = isObject ? opt.value : opt;
                                    const label = isObject ? opt.label : opt.replace(/([A-Z])/g, ' $1').trim();

                                    // Visual representation check
                                    const isColor = field.toLowerCase().includes('color');
                                    let bg = 'var(--surface-highlight)';

                                    if (isColor) {
                                        bg = `#${value}`;
                                    }

                                    const isSelected = config[field] === value;

                                    return (
                                        <button
                                            key={value}
                                            onClick={() => updateConfig(field, value)}
                                            style={{
                                                padding: isColor ? '14px' : '8px 12px',
                                                borderRadius: isColor ? '50%' : '8px',
                                                // FIX UI JITTER: border is always 2px, transparent if not selected
                                                border: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                                                // Fallback border for non-selected to maintain shape if needed, or just transparent
                                                boxShadow: isSelected ? 'none' : 'inset 0 0 0 1px var(--border)', // subtle border for unselected
                                                background: isColor ? bg : (isSelected ? 'var(--primary-dim)' : 'transparent'),
                                                color: isSelected ? 'var(--primary)' : 'white',
                                                cursor: 'pointer', fontSize: '0.8rem', fontWeight: isSelected ? 'bold' : 'normal',
                                                minWidth: isColor ? '0' : '60px'
                                            }}
                                            title={label}
                                        >
                                            {!isColor && label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* FOOTER */}
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
                    <button onClick={onCancel} style={{ padding: '16px', flex: 1, borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onSave(previewUrl)} style={{ padding: '16px', flex: 1, borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}>Use Avatar</button>
                </div>
            </motion.div>
        </div>
    );
}
