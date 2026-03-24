"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Color helpers ---
const INACTIVE_COLOR = '#757575';
const NON_MUSCLE_COLOR = '#434343';

/**
 * Interpolate between two hex colors.
 * @param {number} t - 0.0 (from) to 1.0 (to)
 */
function lerpColor(from, to, t) {
    const fromR = parseInt(from.slice(1, 3), 16);
    const fromG = parseInt(from.slice(3, 5), 16);
    const fromB = parseInt(from.slice(5, 7), 16);
    const toR = parseInt(to.slice(1, 3), 16);
    const toG = parseInt(to.slice(3, 5), 16);
    const toB = parseInt(to.slice(5, 7), 16);
    const r = Math.round(fromR + (toR - fromR) * t);
    const g = Math.round(fromG + (toG - fromG) * t);
    const b = Math.round(fromB + (toB - fromB) * t);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

/**
 * Get the fill color for a muscle based on its intensity (0–1).
 * Gradient: Inactive (#757575) → Mid (#d97706) → High (#faff00)
 */
function getMuscleColor(intensity) {
    if (intensity <= 0) return INACTIVE_COLOR;
    if (intensity < 0.5) return lerpColor(INACTIVE_COLOR, '#d97706', intensity * 2);
    return lerpColor('#d97706', '#faff00', (intensity - 0.5) * 2);
}

/**
 * DynamicMuscleMap
 * 
 * @param {Object} activeMuscles - { svgPathId: 0.0–1.0 }
 * @param {'front'|'rear'} view - Which side to display
 * @param {boolean} animate - Whether to stagger entrance animations
 * @param {string} className - Extra classes for the wrapper
 * @param {number} width - Width of the SVG
 * @param {number} height - Height of the SVG
 */
export default function DynamicMuscleMap({
    activeMuscles = {},
    view = 'front',
    animate = false,
    className = '',
    width = 97,
    height = 216,
}) {
    const containerRef = useRef(null);
    const [glowIds, setGlowIds] = useState([]);

    // Figure out which muscles are at PR level (1.0)
    useEffect(() => {
        const prs = Object.entries(activeMuscles)
            .filter(([, v]) => v >= 1.0)
            .map(([id]) => id);
        setGlowIds(prs);
    }, [activeMuscles]);

    // Apply styles to SVG paths after render
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Style non-muscle elements
        const nonMuscleEls = container.querySelectorAll('[id="no_muscles_front"], [id="no_muscles_rear"], [id="body_front"], [id="body_rear"]');
        nonMuscleEls.forEach(el => {
            el.style.fill = NON_MUSCLE_COLOR;
        });

        // Style all named muscle paths
        const allPaths = container.querySelectorAll('[id]');
        allPaths.forEach(el => {
            const muscleId = el.id;
            if (!muscleId || muscleId.startsWith('body_') || muscleId.startsWith('no_muscles') || muscleId.startsWith('muscles_')) return;
            
            const intensity = activeMuscles[muscleId] ?? 0;
            const color = getMuscleColor(intensity);
            
            el.style.fill = color;
            el.style.transition = 'fill 0.6s ease, filter 0.6s ease, opacity 0.6s ease';

            // PR glow effect
            if (intensity >= 1.0) {
                el.style.filter = 'drop-shadow(0 0 6px #faff00) drop-shadow(0 0 12px #faff00)';
                el.style.animation = 'muscleGlow 1.5s ease-in-out infinite alternate';
            } else if (intensity > 0) {
                el.style.filter = 'none';
                el.style.animation = 'none';
            } else {
                el.style.filter = 'none';
                el.style.animation = 'none';
                el.style.opacity = '0.5';
            }

            // Lower opacity for inactive muscles to make active ones pop
            if (intensity > 0) {
                el.style.opacity = '1';
            }
        });
    }, [activeMuscles, view]);

    const svgSrc = view === 'front' 
        ? '/assets/muscles/muscles_front.svg' 
        : '/assets/muscles/muscles_rear.svg';

    return (
        <>
            <style>{`
                @keyframes muscleGlow {
                    from { filter: drop-shadow(0 0 4px #faff00) drop-shadow(0 0 8px #faff00); }
                    to   { filter: drop-shadow(0 0 10px #faff00) drop-shadow(0 0 20px #faff00); }
                }
            `}</style>

            <motion.div
                ref={containerRef}
                className={`muscle-map-wrapper ${className}`}
                initial={animate ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <object
                    data={svgSrc}
                    type="image/svg+xml"
                    ref={containerRef}
                    style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                    }}
                    onLoad={(e) => {
                        // Access SVG document inside <object>
                        const svgDoc = e.target.contentDocument;
                        if (!svgDoc) return;
                        
                        // Apply colors to all muscle paths in the inline SVG
                        const allPaths = svgDoc.querySelectorAll('[id]');
                        allPaths.forEach(el => {
                            const muscleId = el.id;
                            if (!muscleId || muscleId.startsWith('body_') || muscleId.startsWith('no_muscles') || muscleId.startsWith('muscles_')) {
                                if (muscleId?.startsWith('body_') || muscleId?.startsWith('no_muscles')) {
                                    el.style.fill = NON_MUSCLE_COLOR;
                                }
                                return;
                            }
                            
                            const intensity = activeMuscles[muscleId] ?? 0;
                            const color = getMuscleColor(intensity);
                            
                            el.style.fill = color;
                            el.style.transition = 'fill 0.6s ease, filter 0.6s ease';
                            el.style.opacity = intensity > 0 ? '1' : '0.5';

                            if (intensity >= 1.0) {
                                el.style.animation = 'muscleGlow 1.5s ease-in-out infinite alternate';
                            }
                        });

                        // Inject keyframes into SVG document
                        const styleEl = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
                        styleEl.textContent = `
                            @keyframes muscleGlow {
                                from { filter: drop-shadow(0 0 4px #faff00); }
                                to   { filter: drop-shadow(0 0 12px #faff00); }
                            }
                        `;
                        svgDoc.documentElement.appendChild(styleEl);
                    }}
                />
            </motion.div>
        </>
    );
}

/**
 * InlineMuscleMap - uses img tag for simpler embedding without JS manipulation.
 * Use this for static/read-only thumbnails (history cards).
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
