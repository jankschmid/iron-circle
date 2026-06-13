"use client";

import { useCallback } from 'react';
import DynamicMuscleMap from './DynamicMuscleMap';
import { MUSCLE_ID_MAP } from '@/lib/muscleEngine/muscleMapper';

// Reverse map: SVG ID -> Logical Muscle Group
const getLogicalMuscleFromSvgId = (svgId) => {
    for (const [logicalName, svgIds] of Object.entries(MUSCLE_ID_MAP)) {
        if (svgIds.includes(svgId)) {
            // We want the primary canonical names, so we might want to ensure we return the right one.
            // E.g. MUSCLE_ID_MAP has 'lats' and 'lat'. We want the canonical ones.
            // A simple map of known canonicals:
            const canonicals = [
                'chest', 'front_delts', 'rear_delts', 'triceps', 'biceps', 'forearms',
                'lats', 'traps', 'mid_back', 'lower_back', 'obliques',
                'quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'shins'
            ];
            if (canonicals.includes(logicalName)) return logicalName;
            
            // If the matched logicalName is an alias (like 'pecs' for chest)
            if (logicalName === 'pecs') return 'chest';
            if (logicalName === 'shoulders' || logicalName === 'delts') return 'front_delts'; // fallback
            if (logicalName === 'back') return 'lats';
            if (logicalName === 'arms') return 'biceps';
            if (logicalName === 'core' || logicalName === 'abs') return 'obliques';
            if (logicalName === 'legs' || logicalName === 'lower_body') return 'quads';
            if (logicalName === 'lat') return 'lats';
            if (logicalName === 'front_delt') return 'front_delts';
            if (logicalName === 'rear_delt') return 'rear_delts';
            if (logicalName === 'forearms_front' || logicalName === 'forearms_rear') return 'forearms';
            if (logicalName === 'calves_front' || logicalName === 'calves_rear') return 'calves';
        }
    }
    
    // Direct matches if the SVG id perfectly matches a logical group name
    const canonicals = [
        'chest', 'front_delts', 'rear_delts', 'triceps', 'biceps', 'forearms',
        'lats', 'traps', 'mid_back', 'lower_back', 'obliques',
        'quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'shins'
    ];
    if (canonicals.includes(svgId)) return svgId;

    // Special cases based on actual SVG IDs:
    if (svgId === 'delts_front') return 'front_delts';
    if (svgId === 'delts_rear') return 'rear_delts';
    if (svgId === 'lat_front' || svgId === 'lat_rear') return 'lats';

    return null;
};

export default function InteractiveMuscleMap({
    activeMuscles = {},
    view = 'front',
    onMuscleClick,
    className = '',
    width = 97,
    height = 216
}) {

    const handleClick = useCallback((e) => {
        if (!onMuscleClick) return;

        let target = e.target;
        // Search up the DOM tree for an element with an ID (the SVG path or group)
        while (target && target.tagName !== 'svg') {
            if (target.id) {
                const logicalMuscle = getLogicalMuscleFromSvgId(target.id);
                if (logicalMuscle) {
                    onMuscleClick(logicalMuscle);
                    return; // Stop after first match
                }
            }
            target = target.parentNode;
        }
    }, [onMuscleClick]);

    return (
        <div 
            onClick={handleClick} 
            style={{ cursor: onMuscleClick ? 'pointer' : 'default', touchAction: 'manipulation' }}
            title="Click to toggle muscle intensity"
        >
            <DynamicMuscleMap 
                activeMuscles={activeMuscles}
                view={view}
                className={className}
                width={width}
                height={height}
                animate={false} // Disable enter animation to prevent flashing during live editing
            />
        </div>
    );
}
