
/**
 * IronCircle - Algorithmic Intelligence
 * Calculates smart suggestions for workouts based on history.
 */

// Constants for Progressive Overload
const MICRO_LOAD = 1.25; // kg
const STANDARD_LOAD = 2.5; // kg
const AGGRESSIVE_LOAD = 5; // kg

/**
 * Analyze workout history to suggest the next weight and reps.
 * @param {Array} history - Array of completed workout sessions/logs for a specific exercise.
 *                          Structure: [{ date, sets: [{ weight, reps, rpe, failed }] }]
 * @param {Object} currentStats - Optional current PRs or targets.
 * @returns {Object} { weight, reps, type: 'overload'|'deload'|'maintain'|'recovery', reason: string }
 */
export function getSmartSuggestion(history) {
    if (!history || history.length === 0) {
        return { weight: null, reps: null, type: 'new', reason: "New exercise" };
    }

    // Sort by date descending (newest first)
    // Assuming history is already sorted or we ensure it here
    // const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

    // We need the flattened sets from the logs to analyze volume trends
    // But for the *immediate* suggestion, we look at the LAST SESSION.
    const lastSession = history[0];
    if (!lastSession || !lastSession.sets || lastSession.sets.length === 0) {
        return { weight: null, reps: null, type: 'new', reason: "No recent data" };
    }

    // 1. Check for Deload Condition (4 weeks of consistent volume increase)
    if (shouldSuggestDeload(history)) {
        return calculateDeload(lastSession);
    }

    // 2. Progressive Overload Logic (Based on Best Set of Last Session)
    const bestSet = getBestSet(lastSession.sets);

    // RPE Logic
    // If RPE is missing, assume it was "Okay" (RPE ~8) if completed.
    let rpe = bestSet.rpe || 8;

    // Check failure
    if (bestSet.failed) {
        // If failed last time, deload slightly or maintain
        return {
            weight: roundTostep(bestSet.weight * 0.9), // -10%
            reps: bestSet.reps,
            type: 'recovery',
            reason: "Last session was too heavy"
        };
    }

    // Overload Rules
    if (rpe <= 7) {
        // Easy: Increase Weight
        return {
            weight: bestSet.weight + STANDARD_LOAD,
            reps: bestSet.reps,
            type: 'overload',
            reason: "Last session was easy (RPE < 7)"
        };
    } else if (rpe <= 8.5) {
        // Moderate: Micro-load
        return {
            weight: bestSet.weight + MICRO_LOAD,
            reps: bestSet.reps,
            type: 'overload',
            reason: "Progressive Overload"
        };
    } else if (rpe >= 9.5) {
        // Hard: Maintain
        return {
            weight: bestSet.weight,
            reps: bestSet.reps,
            type: 'maintain',
            reason: "High intensity, maintain weight"
        };
    } else {
        // Default (RPE ~9): Maintain or Micro-load if feeling good (User discretion, but we suggest maintain)
        return {
            weight: bestSet.weight,
            reps: bestSet.reps,
            type: 'maintain',
            reason: "Maintain consistency"
        };
    }
}

/**
 * Calculates volume (weight * reps * sets) for a session.
 */
function getSessionVolume(session) {
    return session.sets.reduce((total, set) => total + (set.weight * set.reps), 0);
}

/**
 * Checks if a deload should be suggested.
 * Logic: Volume increased > 5% every week for 4 weeks.
 */
function shouldSuggestDeload(history) {
    if (history.length < 4) return false;

    // Get last 4 sessions
    const recent = history.slice(0, 4);

    // Calculate volumes
    const volumes = recent.map(getSessionVolume).reverse(); // [Week 1, Week 2, Week 3, Week 4 (Latest)]

    // Check strict increase
    let isIncreasing = true;
    for (let i = 0; i < volumes.length - 1; i++) {
        const current = volumes[i];
        const next = volumes[i + 1];
        const increaseParams = next > current * 1.05; // >5% increase
        if (!increaseParams) {
            isIncreasing = false;
            break;
        }
    }

    return isIncreasing;
}

function calculateDeload(lastSession) {
    const bestSet = getBestSet(lastSession.sets);
    return {
        weight: roundTostep(bestSet.weight * 0.6), // 60% of weight
        reps: Math.floor(bestSet.reps * 0.6),      // 60% of reps
        type: 'deload',
        reason: "Deload Week Suggested (4 weeks high intensity)"
    };
}

/**
 * Helper to find the "Best Set" (Highest 1RM or Volume).
 * Logic: Max Weight, then Max Reps.
 */
function getBestSet(sets) {
    return sets.reduce((best, current) => {
        if (current.weight > best.weight) return current;
        if (current.weight === best.weight && current.reps > best.reps) return current;
        return best;
    }, sets[0]);
}

/**
 * Helper to round to nearest 1.25 or 2.5
 */
function roundTostep(value, step = 1.25) {
    return Math.round(value / step) * step;
}
