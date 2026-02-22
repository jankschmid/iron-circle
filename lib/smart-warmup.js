// lib/smart-warmup.js
import { EXERCISES } from './data';

/**
 * Generates a smart warm-up plan based on the target muscles of the workout.
 * @param {Object} template The workout template being started
 * @param {Array} allExercises List of all available exercises (from DB/Store)
 * @returns {Array} List of warm-up exercises (objects)
 */
export function getWarmupForRoutine(template, allExercises = []) {
    if (!template || !template.exercises) return [];

    // 1. Identify Target Muscles
    const targets = new Set();
    template.exercises.forEach(ex => {
        // Try to find full exercise details with loose equality for ID matching
        const fullEx = allExercises.find(e => e.id == ex.id) || EXERCISES.find(e => e.id == ex.id) || ex;
        if (fullEx.muscle) {
            targets.add(fullEx.muscle);
        }
    });

    const muscles = Array.from(targets);
    console.log("Warmup Logic: Detected Muscles:", muscles);

    const warmupRoutine = [];

    // 2. Select Activation Exercises based on Muscles
    // Rule: Max 3 activation exercises

    // CHEST / SHOULDERS
    if (muscles.some(m => ['Chest', 'Shoulders'].includes(m))) {
        warmupRoutine.push({ id: 'w_arm_circles', name: 'Arm Circles', duration: '30s', type: 'Stretch' });
        warmupRoutine.push({ id: 'w_wall_slides', name: 'Wall Slides', duration: '12 reps', type: 'Stretch' });
    }

    // LEGS / GLUTES
    if (muscles.some(m => ['Legs', 'Glutes', 'Calves'].includes(m))) {
        warmupRoutine.push({ id: 'w_leg_swings', name: 'Leg Swings', duration: '15 reps/side', type: 'Stretch' });
        warmupRoutine.push({ id: 'w_deep_squat', name: 'Deep Squat Hold', duration: '30s', type: 'Stretch' });
    }

    // BACK
    if (muscles.includes('Back')) {
        warmupRoutine.push({ id: 'w_cat_cow', name: 'Cat-Cow', duration: '10 reps', type: 'Stretch' });
        warmupRoutine.push({ id: 'w_thoracic', name: 'Thoracic Rotation', duration: '8 reps/side', type: 'Stretch' });
    }

    // CORE (If strictly core or if needed)
    // (Optional, maybe skip for now to keep it short)

    // Deduplicate and Limit to 3 (prioritizing unique movements)
    const unique = [];
    const names = new Set();

    for (const ex of warmupRoutine) {
        if (!names.has(ex.name)) {
            names.add(ex.name);
            unique.push(ex);
        }
    }

    return unique.slice(0, 3);
}

export const GENERAL_WARMUP = [
    {
        id: 'general_cardio',
        name: 'General Cardio (5-10 min)',
        type: 'Cardio',
        muscle: 'Full Body',
        default_duration: 300 // 5 min
    }
];
