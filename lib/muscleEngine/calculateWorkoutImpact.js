import { getMusclesForExercise } from './muscleMapper';

/**
 * calculateWorkoutImpact.js
 * 
 * Calculates a heat score (0.0–1.0) per muscle from a workout session.
 * 
 * Formula per muscle:
 *   base_score = (sets * reps * weight_factor) normalized against a "hard" session baseline
 *   rpe_multiplier = RPE / 10  (RPE 10 = full score, RPE 5 = half)
 *   final = min(1.0, base_score * rpe_multiplier)
 * 
 * Secondary muscles get 40% of the score.
 * 
 * @param {Object} session - Workout session object
 * @param {Array}  session.exercises - Array of exercise objects
 * @param {string} session.exercises[].name - Exercise name
 * @param {Array}  session.exercises[].sets - Array of set objects
 * @param {number} session.exercises[].sets[].reps - Reps performed
 * @param {number} session.exercises[].sets[].weight - Weight (kg or lbs)
 * @param {number} session.exercises[].sets[].rpe - Rate of Perceived Exertion (1–10)
 * @param {number} [session.exercises[].sets[].rir] - Reps in Reserve (optional)
 * 
 * @returns {Object} { muscleId: 0.0–1.0 } heat object
 */
export function calculateWorkoutImpact(session) {
    if (!session?.exercises?.length) return {};

    const muscleVolume = {}; // { muscleId: totalWeightedVolume }
    const BASELINE_VOLUME = 5000; // ~5 sets of 5 reps at 200kg → 1.0 score

    for (const exercise of session.exercises) {
        if (!exercise?.name || !exercise?.sets?.length) continue;

        const { primary, secondary } = getMusclesForExercise(exercise.name);
        if (!primary.length && !secondary.length) continue;

        for (const set of exercise.sets) {
            const reps = set.reps || 0;
            const weight = set.weight || 0;
            const rpe = set.rpe || 7; // default to 7 if not set
            const rir = set.rir;
            
            // If RIR is available, derive RPE from it (RIR 0 = RPE 10, RIR 3+ = RPE 7)
            const effectiveRpe = rir !== undefined ? Math.max(7, 10 - rir) : rpe;

            const rpeMultiplier = effectiveRpe / 10;
            const volume = reps * (weight || 1) * rpeMultiplier;

            for (const muscleId of primary) {
                muscleVolume[muscleId] = (muscleVolume[muscleId] || 0) + volume;
            }
            for (const muscleId of secondary) {
                muscleVolume[muscleId] = (muscleVolume[muscleId] || 0) + volume * 0.4;
            }
        }
    }

    // Normalize to 0.0–1.0
    const heatMap = {};
    for (const [muscleId, volume] of Object.entries(muscleVolume)) {
        heatMap[muscleId] = Math.min(1.0, volume / BASELINE_VOLUME);
    }

    return heatMap;
}

/**
 * Get a "quick" heatmap from a simple muscle list (for predefined workout plans)
 * @param {string[]} primaryMuscles - Array of muscle keys
 * @param {string[]} [secondaryMuscles] - Array of secondary muscle keys
 * @returns {Object} heat map { muscleId: 0.0-1.0 }
 */
export function getMuscleHeatFromList(primaryMuscles = [], secondaryMuscles = []) {
    const heat = {};
    for (const m of primaryMuscles) heat[m] = 0.85;
    for (const m of secondaryMuscles) heat[m] = 0.45;
    return heat;
}
