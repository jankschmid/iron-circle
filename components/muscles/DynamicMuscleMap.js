"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getSvgIdsForMuscle } from '@/lib/muscleEngine/muscleMapper';

// --- Color helpers ---
const INACTIVE_COLOR = '#757575';
const MID_COLOR = '#d97706';
const ACTIVE_COLOR = '#faff00';

function lerpHex(from, to, t) {
    const p = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
    const r = c => Math.round(c).toString(16).padStart(2, '0');
    return `#${r(p(from,1)+(p(to,1)-p(from,1))*t)}${r(p(from,3)+(p(to,3)-p(from,3))*t)}${r(p(from,5)+(p(to,5)-p(from,5))*t)}`;
}

function getMuscleColor(intensity) {
    if (intensity <= 0) return INACTIVE_COLOR;
    if (intensity < 0.5) return lerpHex(INACTIVE_COLOR, MID_COLOR, intensity * 2);
    return lerpHex(MID_COLOR, ACTIVE_COLOR, (intensity - 0.5) * 2);
}

/**
 * DynamicMuscleMap
 * 
 * Safely fetches the SVG template as a string and patches all `fill` and `filter` styles
 * dynamically via RegExp. This completely bypasses the `<object>` tag restrictions 
 * found inside Native WebViews and allows flawless Framer Motion integration.
 */
export default function DynamicMuscleMap({
    activeMuscles = {},
    view = 'front',
    animate = false,
    className = '',
    width = 97,
    height = 216,
}) {
    const [svg, setSvg] = useState('');

    useEffect(() => {
        const path = view === 'front'
            ? '/assets/muscles/muscles_front.svg'
            : '/assets/muscles/muscles_rear.svg';
            
        // Uses the public folder absolute fetch path
        fetch(path)
            .then(r => r.text())
            .then(setSvg)
            .catch(e => console.error("Error loading SVG:", e));
    }, [view]);

    const getPatchedSVG = useCallback(() => {
        if (!svg) return '';
        let out = svg;

        // 1. Disable Non-Muscle bodies
        // The default raw SVG might have inline style="fill:xxx" already.
        const nonMuscles = ['no_muscles_front', 'no_muscles_rear', 'body_front', 'body_rear'];
        nonMuscles.forEach(id => {
            out = out.replace(
                new RegExp(`(id="${id}"[^>]*?style=")([^"]*?)(")`, 'g'),
                `$1fill:#434343;$3`
            );
        });

        // 2. Patch Active / Inactive Muscles
        // We know exactly what muscle IDs are.
        // First we set all known muscle IDs to INACTIVE
        const allKeys = Object.keys(activeMuscles).length > 0 
            ? Object.keys(activeMuscles)
            : []; // We will just apply active ones directly to override

        for (const [logicalId, rawIntensity] of Object.entries(activeMuscles)) {
            // Cap visual intensity between 0 and 1
            const intensity = Math.min(1.0, Math.max(0, rawIntensity));
            const color = getMuscleColor(intensity);
            
            // Generate Style Payload
            let stylePayload = `fill:${color}; transition: all 0.5s ease-out;`;
            
            if (intensity > 0) {
                stylePayload += ' opacity: 1;';
            } else {
                stylePayload += ' opacity: 0.5;';
            }

            // Glow / Highlight Effect
            if (intensity >= 0.95) {
                // Drop shadow inline filter
                stylePayload += ` filter: drop-shadow(0 0 6px ${ACTIVE_COLOR});`;
            }

            // Replace existing style group for all matching SVG IDs
            const svgIds = getSvgIdsForMuscle(logicalId);
            svgIds.forEach(id => {
                out = out.replace(
                    new RegExp(`(id="${id}"[^>]*?style=")([^"]*?)(")`, 'g'),
                    `$1${stylePayload}$3`
                );
            });
        }

        // Return patched HTML string
        return out;
    }, [svg, activeMuscles]);

    if (!svg) {
        return (
            <div 
                className={`flex items-center justify-center ${className}`}
                style={{ width: `${width}px`, height: `${height}px` }}
            >
                <div className="w-8 h-8 rounded-full bg-surface-highlight animate-pulse" />
            </div>
        );
    }

    return (
        <motion.div
            className={`muscle-map-wrapper flex items-center justify-center ${className}`}
            initial={animate ? { opacity: 0, scale: 0.95 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{ width: `${width}px`, height: `${height}px` }}
            dangerouslySetInnerHTML={{ __html: getPatchedSVG() }}
        />
    );
}

/**
 * StaticMuscleThumbnail - uses image tag for fast read-only rendering without state parsing.
 */
export function StaticMuscleThumbnail({ view = 'front', className = '' }) {
    const svgSrc = view === 'front' 
        ? '/assets/muscles/muscles_front.svg' 
        : '/assets/muscles/muscles_rear.svg';

    return (
        <img 
            src={svgSrc} 
            alt={`Muscle map ${view}`}
            className={className}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
    );
}
