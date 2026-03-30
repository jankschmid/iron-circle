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
export function calculateWorkoutImpact(session, exercisesRegistry = null, nowTime = Date.now()) {
    // Determine the iterable logs (App uses hitstory format `logs`, some old test data might use `exercises`)
    const logs = session?.logs || session?.exercises;
    if (!logs?.length) return {};

    const muscleVolume = {}; // { muscleId: totalWeightedVolume }
    const BASELINE_VOLUME = 5000; // ~5 sets of 5 reps at 200kg → 1.0 score

    for (const log of logs) {
        if (!log?.sets?.length) continue;

        let exerciseName = log.name; // if raw name is provided
        
        // If the app provided an exerciseId instead of a name, resolve it
        if (!exerciseName && log.exerciseId && exercisesRegistry) {
            const definedEx = exercisesRegistry.find(e => e.id === log.exerciseId);
            if (definedEx) exerciseName = definedEx.name;
        }

        if (!exerciseName) continue;

        const { primary, secondary } = getMusclesForExercise(exerciseName);
        if (!primary.length && !secondary.length) continue;

        for (const set of log.sets) {
            if (set.completed === false) continue; // Skip incomplete sets

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

    // Mathematical Recovery Decay Logic
    // If the workout was e.g. 2 days ago, the impact drops.
    let decayMultiplier = 1.0;
    if (session.endTime) {
        const diffMs = nowTime - new Date(session.endTime).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours > 72) {
            decayMultiplier = 0.0; // Completely recovered after 3+ days
        } else if (diffHours > 24) {
            // Linear decay from 1.0 (at 24h) to 0.0 (at 72h)
            // (72 - h) / 48 => at 24h: 48/48=1, at 48h: 24/48=0.5, at 72h: 0
            decayMultiplier = Math.max(0, (72 - diffHours) / 48);
        }
    }

    // Normalize to 0.0–1.0 and apply decay
    const heatMap = {};
    for (const [muscleId, volume] of Object.entries(muscleVolume)) {
        const rawScore = Math.min(1.0, volume / BASELINE_VOLUME);
        const decayedScore = rawScore * decayMultiplier;
        if (decayedScore > 0) {
            heatMap[muscleId] = decayedScore;
        }
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

/**
 * calculateTemplateImpact
 * Estimates the muscle impact of a workout template before it is started.
 * Calculates predictive heat based on assigned exercises.
 */
export function calculateTemplateImpact(template, exercisesRegistry = null) {
    const heatMap = {};
    if (!template?.exercises?.length) return heatMap;

    template.exercises.forEach(ex => {
        let exerciseName = ex.name;
        
        // Resolve from ID if no explicit name
        if (!exerciseName && ex.id && exercisesRegistry) {
            const definedEx = exercisesRegistry.find(e => e.id === ex.id);
            if (definedEx) exerciseName = definedEx.name;
        }

        if (exerciseName) {
            const { primary, secondary } = getMusclesForExercise(exerciseName);
            // Assign predictive heat values
            primary.forEach(m => { heatMap[m] = Math.max(heatMap[m] || 0, 0.9); }); 
            secondary.forEach(m => { heatMap[m] = Math.max(heatMap[m] || 0, 0.5); }); 
        }
    });

    return heatMap;
}
