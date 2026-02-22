
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
 * Analyzes workout history to suggest the next weight and reps using Double Progression.
 * @param {Array} setsArray - Array of completed sets for THIS exercise (either from current session or previous session).
 * @param {Object} assignment - Optional context { targetGoal: "8-12"|"auto", settings: {...}, exerciseDef: {...} }
 * @returns {Object|null} { weight, reps, type, reason, isPush } or null if strict mode.
 */
export function getSmartSuggestion(setsArray, assignment = null) {
    // 0. Strict Mode Check
    if (assignment && assignment.settings && assignment.settings.is_strict) {
        return null; // Trainer overrides algorithm entirely
    }

    // 1. Determine Goal (Explicit vs Implicit)
    let goal = parseGoal(assignment?.targetGoal);

    // Fallback if no goal and we want to detect from sets
    if (!goal) {
        goal = { style: 'Hypertrophy', min: 8, max: 12 }; // Default since detectTrainingStyle was broken for set arrays
    }

    if (!setsArray || setsArray.length === 0) {
        return {
            weight: null,
            reps: goal.min,
            type: 'new',
            reason: `New Exercise (${goal.style})`,
            isPush: false
        };
    }

    // 3. Extract Best Set Data from the array of sets
    const bestSet = getBestSet(setsArray);
    const lastWeight = parseFloat(bestSet.weight || 0);
    const lastReps = parseFloat(bestSet.reps || 0);

    // 4. Extract Progression Step (from DB definition)
    const progressionStep = assignment?.exerciseDef?.progression_step ? parseFloat(assignment.exerciseDef.progression_step) : 1.25;

    // 5. Double Progression Implementation
    // Override if they failed the lift completely
    if (bestSet.failed || (bestSet.rpe && parseFloat(bestSet.rpe) > 9.5)) {
        return {
            weight: lastWeight,
            reps: lastReps > 1 ? lastReps - 1 : 1,
            type: 'maintain',
            reason: "High Intensity/Failure: Deload reps slightly to recover.",
            isPush: false // GRAY GHOST
        };
    }

    return calculateNextSet(lastWeight, lastReps, goal.style, progressionStep);
}

/**
 * Executes the Double Progression Ruleset.
 * @param {number} lastWeight 
 * @param {number} lastReps 
 * @param {string} focusMode (Strength, Hypertrophy, Endurance)
 * @param {number} progressionStep 
 */
export function calculateNextSet(lastWeight, lastReps, focusMode, progressionStep = 1.25) {
    let minTargetReps = 8, maxTargetReps = 12; // Hypertrophy Default

    if (focusMode === 'Strength') {
        minTargetReps = 3; maxTargetReps = 5;
    } else if (focusMode === 'Endurance') {
        minTargetReps = 15; maxTargetReps = 20;
    } else if (focusMode === 'Custom') {
        // Could use explicit min/max, but mapping back to standard for safety
        minTargetReps = 8; maxTargetReps = 12;
    }

    // Rule A: Progression Hit (Max reps achieved)
    if (lastReps >= maxTargetReps) {
        return {
            weight: lastWeight + progressionStep,
            reps: minTargetReps,
            reason: `Hit Max Target (${lastReps} Reps). Increased weight by ${progressionStep}kg.`,
            type: 'push',
            isPush: true
        };
    }

    // Rule B: Grinding (Inside the rep range)
    if (lastReps >= minTargetReps && lastReps < maxTargetReps) {
        return {
            weight: lastWeight,
            reps: lastReps + 1,
            reason: `Optimal Range. Push for 1 more rep to reach ${maxTargetReps}.`,
            type: 'build',
            isPush: true
        };
    }

    // Rule C: Underperforming (Below minimum range)
    if (lastReps < minTargetReps) {
        return {
            weight: lastWeight,
            reps: minTargetReps, // Stabilize at minimum
            reason: `Below target range. Stabilize at minimum ${minTargetReps} reps.`,
            type: 'maintain',
            isPush: false
        };
    }

    return { weight: lastWeight, reps: lastReps, type: 'maintain', reason: "Maintain Load", isPush: false };
}

// --- PERFORMANCE ANALYSIS ---

/**
 * Analyzes a completed session against history to generate insights.
         * @param {Object} currentSession - The session object just completed (with logs).
         * @param {Array} history - Full user workout history.
         * @param {Object} oldPrs - Snapshot of PRs BEFORE this session.
         * @returns {Object} { volumeDelta, intensityDelta, newRecords: [] }
         */
export function analyzeSession(currentSession, history, oldPrs = {}) {
    if (!currentSession || !history) return { volumeDelta: 0, intensityDelta: 0, newRecords: [] };

    // 1. Calculate Current Metrics
    const currentVolume = currentSession.volume || 0;
    const currentReps = currentSession.logs.reduce((acc, log) => acc + log.sets.filter(s => s.completed).length, 0); // Using sets as proxy for "reps" count if raw reps needed, but Intensity = Vol / Reps is better.
    // Actually Intensity is usually Avg Weight.
    // Let's use Avg Weight = Volume / Total Reps.
    let totalReps = 0;
    currentSession.logs.forEach(log => {
        log.sets.forEach(s => {
            if (s.completed) totalReps += (parseFloat(s.reps) || 0);
        });
    });
    const currentIntensity = totalReps > 0 ? (currentVolume / totalReps) : 0;

    // 2. Calculate 4-Week Average (Volume & Intensity)
    const now = new Date();
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(now.getDate() - 28);

    const recentSessions = history.filter(h => new Date(h.endTime) > fourWeeksAgo && h.id !== currentSession.id);

    let avgVolume = 0;
    let avgIntensity = 0;

    if (recentSessions.length > 0) {
        const totalRecentVol = recentSessions.reduce((acc, s) => acc + (s.volume || 0), 0);
        avgVolume = totalRecentVol / recentSessions.length;

        const totalRecentIntensity = recentSessions.reduce((acc, s) => {
            // Re-calculate intensity for each past session if not stored
            // Assuming we don't store "intensity" explicitly, we might skip or approximate.
            // If strictly needed, we need to dive into logs.
            // For MVP, let's just use Volume Delta which is most important.
            // And maybe "Max Weight" Delta?
            return acc;
        }, 0);
        // Let's stick to Volume Delta for now as it's robust.
    }

    // Calculate Delta %
    const volumeDelta = avgVolume > 0 ? Math.round(((currentVolume - avgVolume) / avgVolume) * 100) : 100;

    // 3. Identification of New PRs
    const newRecords = [];
    currentSession.logs.forEach(log => {
        if (!log.exerciseId) return;
        // Check if we have a name (we might need to fetch it or pass it)
        // Passed logs usually have "exercise" object or we need to look it up.
        // For now, we assume we can get the name from the log or store lookups in UI.
        // We will return the ID and value.

        const oldPr = oldPrs[log.exerciseId] || 0;
        const maxSet = Math.max(0, ...log.sets.filter(s => s.completed).map(s => Number(s.weight) || 0));

        if (maxSet > oldPr && maxSet > 0) {
            newRecords.push({
                exerciseId: log.exerciseId,
                value: maxSet,
                previous: oldPr
            });
        }
    });

    return {
        volumeDelta,
        intensityDelta: 0, // Placeholder/Todo
        newRecords
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
 */
function shouldSuggestDeload(history) {
    if (history.length < 5) return false;
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
 * Helper to round to nearest 1.25 or 2.5
 */
function roundTostep(value, step = 1.25) {
    return Math.round(value / step) * step;
}

/**
 * Helper to find the "Best Set" (Highest 1RM or Volume).
 */
function getBestSet(sets) {
    if (!sets || sets.length === 0) return { weight: 0, reps: 0, rpe: 0 };
    return sets.reduce((prev, current) => {
        const pW = parseFloat(prev.weight) || 0;
        const cW = parseFloat(current.weight) || 0;
        if (cW > pW) return current;
        if (cW === pW) {
            const pR = parseFloat(prev.reps) || 0;
            const cR = parseFloat(current.reps) || 0;
            return cR > pR ? current : prev;
        }
        return prev;
    }, sets[0]);
}




