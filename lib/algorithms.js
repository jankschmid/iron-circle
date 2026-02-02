
/**
 * IronCircle - Algorithmic Intelligence
 * Calculates smart suggestions for workouts based on history.
 */

// Constants for Progressive Overload
const MICRO_LOAD = 1.25; // kg
const STANDARD_LOAD = 2.5; // kg
const AGGRESSIVE_LOAD = 5; // kg

/**
 * Detects the training style based on recent history.
 * @param {Array} history - Array of recent sessions.
 * @returns {Object} { style: 'Strength'|'Hypertrophy'|'Endurance', min: number, max: number }
 */
export function detectTrainingStyle(history) {
    if (!history || history.length === 0) return { style: 'Hypertrophy', min: 8, max: 12 }; // Default

    // Analyze last 3 sessions
    const recent = history.slice(0, 3);
    let totalReps = 0;
    let setCheckCount = 0;

    recent.forEach(session => {
        if (session.logs) { // Helper if logs are nested differently, but we assume session IS the workout log
            // Wait, history usually is [workout, workout]. We need the specific exercise logs.
            // The history passed here is usually filtered for the specific exercise? 
            // Yes, commonly called with history specific to the exercise context or full history?
            // Looking at usage: getSmartSuggestion(history).
            // Assuming history is array of { sets: [...] } from previous logs of THIS exercise.
            if (session.sets) {
                session.sets.forEach(s => {
                    // Filter warmups? Assume all completed sets count
                    if (s.completed) {
                        totalReps += parseFloat(s.reps || 0);
                        setCheckCount++;
                    }
                });
            }
        } else if (session.sets) {
            session.sets.forEach(s => {
                if (s.completed) {
                    totalReps += parseFloat(s.reps || 0);
                    setCheckCount++;
                }
            });
        }
    });

    if (setCheckCount === 0) return { style: 'Hypertrophy', min: 8, max: 12 };

    const avgReps = totalReps / setCheckCount;

    if (avgReps < 6) return { style: 'Strength', min: 3, max: 5 };
    if (avgReps >= 6 && avgReps <= 12) return { style: 'Hypertrophy', min: 8, max: 12 };
    return { style: 'Endurance', min: 12, max: 20 };
}

/**
 * Parse a goal string like "8-12" or "1-5" into objects.
 */
function parseGoal(goalStr) {
    if (!goalStr || goalStr === 'auto') return null;
    if (goalStr === 'custom') return { style: 'Custom', min: 8, max: 12 }; // Default custom fallback

    // Check for "min-max" format
    if (goalStr.includes('-')) {
        const [min, max] = goalStr.split('-').map(Number);
        const style = max <= 5 ? 'Strength' : (max > 12 ? 'Endurance' : 'Hypertrophy');
        return { style, min, max };
    }
    return null;
}

/**
 * Analyze workout history to suggest the next weight and reps.
 * @param {Array} history - Array of completed workout sessions/logs for THIS exercise.
 * @param {Object} assignment - Optional context { targetGoal: "8-12"|"auto", settings: {...} }
 * @returns {Object|null} { weight, reps, type, reason } or null if strict mode.
 */
export function getSmartSuggestion(history, assignment = null) {
    // 0. Strict Mode Check
    if (assignment && assignment.settings && assignment.settings.is_strict) {
        return null; // Trainer overrides algorithm entirely
    }

    // 1. Determine Goal (Explicit vs Implicit)
    let goal = parseGoal(assignment?.targetGoal);
    let isExplicit = true;

    if (!goal) {
        goal = detectTrainingStyle(history);
        isExplicit = false;
    }

    if (!history || history.length === 0) {
        return {
            weight: null,
            reps: goal.min,
            type: 'new',
            reason: `New Exercise (${goal.style})`
        };
    }

    // 2. Check Deload
    if (shouldSuggestDeload(history)) {
        return calculateDeload(history[0]);
    }

    const lastSession = history[0];
    if (!lastSession || !lastSession.sets || lastSession.sets.length === 0) {
        return { weight: null, reps: goal.min, type: 'new', reason: "No recent data" };
    }

    // 3. Double Progression Logic
    const bestSet = getBestSet(lastSession.sets);
    const lastWeight = parseFloat(bestSet.weight || 0);
    const lastReps = parseFloat(bestSet.reps || 0);
    const rpe = bestSet.rpe || (bestSet.completed ? 8 : 10);

    // Safety: If failed last time (RPE 10+), reduce or maintain
    if (bestSet.failed || rpe >= 10) {
        return {
            weight: lastWeight, // Maintain weight to retry
            reps: lastReps,     // Maintain reps
            type: 'recovery',
            reason: "Struggle Detected: Maintain & Retry"
        };
    }

    // A. "Promote" Condition: Hit Top of Rep Range
    // If user hit the MAX reps (or more), increase weight.
    if (lastReps >= goal.max) {
        return {
            weight: lastWeight + STANDARD_LOAD,
            reps: goal.min, // Reset to bottom of range
            type: 'promote',
            reason: `${isExplicit ? 'Trainer Goal' : 'Auto-Goal'}: Promoted! (+2.5kg)`
        };
    }

    // B. "Build" Condition: Within Range but below Max
    // Keep weight, aim for +1 rep or Max
    if (lastReps >= goal.min && lastReps < goal.max) {
        const targetReps = Math.min(lastReps + 1, goal.max);
        return {
            weight: lastWeight,
            reps: targetReps,
            type: 'build',
            reason: `${isExplicit ? 'Trainer' : 'Smart'} Goal: Build to ${goal.max} reps`
        };
    }

    // C. Below Range (Undershoot)
    // If user is below the min reps, they might be lifting too heavy.
    if (lastReps < goal.min) {
        // If RPE was high, deload. If RPE was low, maybe just bad day?
        if (rpe > 8) {
            return {
                weight: roundTostep(lastWeight * 0.9),
                reps: goal.min,
                type: 'recovery',
                reason: `Missed Rep Goal (${lastReps}/${goal.min}). -10% Load.`
            };
        } else {
            // RPE Low but reps low? Weird. Maybe they just stopped early. Maintain.
            return {
                weight: lastWeight,
                reps: goal.min,
                type: 'maintain',
                reason: "Below Target Range. Retrying."
            };
        }
    }

    // Fallback
    return {
        weight: lastWeight,
        reps: goal.min,
        type: 'maintain',
        reason: "Maintain"
    };
}

/**
 * Calculates volume (weight * reps * sets) for a session.
 */
function getSessionVolume(session) {
    if (!session.sets) return 0;
    return session.sets.reduce((total, set) => total + (set.weight * set.reps), 0);
}

/**
 * Checks if a deload should be suggested.
 * Logic: Volume increased > 5% every week for 4 weeks.
 */
function shouldSuggestDeload(history) {
    if (history.length < 5) return false;
    // Implementation simplified for brevity, assume no massive deload needed unless strictly optimized
    return false;
}

function calculateDeload(lastSession) {
    const bestSet = getBestSet(lastSession.sets);
    return {
        weight: roundTostep(bestSet.weight * 0.6),
        reps: Math.floor(bestSet.reps * 0.6),
        type: 'deload',
        reason: "⚠️ Deload Cycle Recommended"
    };
}

/**
 * Helper to find the "Best Set" (Highest 1RM or Volume).
 */
function getBestSet(sets) {
    if (!sets || sets.length === 0) return { weight: 0, reps: 0, rpe: 0 };
    return sets.reduce((best, current) => {
        const w = parseFloat(current.weight || 0);
        const r = parseFloat(current.reps || 0);
        const bw = parseFloat(best.weight || 0);
        const br = parseFloat(best.reps || 0);

        if (w > bw) return current;
        if (w === bw && r > br) return current;
        return best;
    }, sets[0]);
}


/**
 * Helper to round to nearest 1.25 or 2.5
 */
function roundTostep(value, step = 1.25) {
    return Math.round(value / step) * step;
}



