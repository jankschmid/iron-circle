/**
 * IronCircle - Algorithmic Intelligence (Smart Progression Engine)
 * Calculates smart suggestions for workouts based on history using a Decision Tree.
 */

export function detectTrainingStyle(history) {
    if (!history || history.length === 0) return { style: 'Hypertrophy', min: 8, max: 12 };
    const recent = history.slice(0, 3);
    let totalReps = 0;
    let setCheckCount = 0;

    recent.forEach(session => {
        if (session.sets) {
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

function parseGoal(goalStr, userRepRange) {
    if (goalStr && goalStr.includes('-')) {
        const [min, max] = goalStr.split('-').map(Number);
        const style = max <= 5 ? 'Strength' : (max > 12 ? 'Endurance' : 'Hypertrophy');
        return { style, min, max, targetReps: max };
    }
    if (userRepRange?.min != null && userRepRange?.max != null) {
        const max = userRepRange.max;
        const style = max <= 5 ? 'Strength' : (max > 12 ? 'Endurance' : 'Hypertrophy');
        return { style, min: userRepRange.min, max, targetReps: max };
    }
    return { style: 'Hypertrophy', min: 8, max: 12, targetReps: 12 };
}

function getBestSet(sets) {
    if (!sets || sets.length === 0) return { weight: 0, reps: 0, rir: null, rpe: null };
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

/**
 * Smart Progression Engine
 * Decision Tree based progression based on the last Top Set.
 */
export function calculateSmartProgression(setsArray, assignment = null) {
    if (assignment?.settings?.is_strict) return null;

    if (!setsArray || setsArray.length === 0) {
        // Fallback for completely new exercise
        const goal = parseGoal(assignment?.targetGoal, assignment?.userRepRange);
        return {
            weight: 0,
            reps: goal.targetReps,
            progression_status: 'new',
            reason: `New Exercise (${goal.style})`,
            isPush: false
        };
    }

    // Determine Goal and Target Reps
    const goal = parseGoal(assignment?.targetGoal, assignment?.userRepRange);
    const targetReps = goal.targetReps;
    
    // Determine Equipment Increment
    const equip = assignment?.exerciseDef?.equipment_type || 'barbell';
    const dbIncrement = assignment?.exerciseDef?.default_increment ? parseFloat(assignment.exerciseDef.default_increment) : null;
    let increment = dbIncrement;
    if (!increment) {
        if (equip === 'cable' || equip === 'machine' && assignment?.exerciseDef?.name?.toLowerCase().includes('raise') ) increment = 1.25;
        else if (equip === 'machine') increment = 2.5;
        else increment = 2.5; // default
    }

    // Extract Top Set
    const topSet = getBestSet(setsArray);
    const actualReps = parseFloat(topSet.reps || 0);
    const actualWeight = parseFloat(topSet.weight || 0);
    
    // In our DB, we store 'rir' in the set object if the user used the frictionless buttons.
    // If rpe is used instead historically, rir = 10 - rpe. 
    // BUT the prompt specifies tracking rir directly. We'll read topSet.rir.
    let rir = topSet.rir !== undefined && topSet.rir !== null ? parseFloat(topSet.rir) : null;
    
    // Fallback: If rir is unavilable, guess it.
    if (rir == null) {
        rir = actualReps >= targetReps ? 2 : 0;
    }

    // Handle Current Status (for "The Wall" 2nd time check)
    // For now, we look at the topSet if it has a saved status, or assume wall_1 if they failed.
    const currentStatus = topSet.progression_status || 'unknown';

    let nextWeight = actualWeight;
    let nextReps = targetReps;
    let nextStatus = 'level_up';
    let reason = '';

    // Path D: The Spike
    if (actualReps >= targetReps + 3) {
        nextStatus = 'spike';
        nextWeight = actualWeight + increment;
        reason = `Hulk-Ausreißer! 💥 Gedeckelt auf Ziel-Reps, wir steigern um +${increment}kg.`;
        return { weight: nextWeight, reps: nextReps, progression_status: nextStatus, reason, isPush: true };
    }

    // Path A: The Sweet Spot
    if (actualReps >= targetReps && rir >= 2) {
        nextStatus = 'level_up';
        nextWeight = actualWeight + increment;
        reason = `Sweet Spot 🎯! Gewicht war kontrollierbar. Level Up +${increment}kg.`;
        return { weight: nextWeight, reps: nextReps, progression_status: nextStatus, reason, isPush: true };
    }

    // Path B: The Grind
    if (actualReps >= targetReps && rir <= 1) {
        nextStatus = 'mastery';
        nextWeight = actualWeight;
        reason = `The Grind 😅. Ziel erreicht, aber am Limit. Nächstes Mal nochmal sauber (Ziel: RIR 2).`;
        return { weight: nextWeight, reps: nextReps, progression_status: nextStatus, reason, isPush: false };
    }

    // Path C: The Wall
    if (actualReps < targetReps && rir === 0) {
        let consecutiveFails = currentStatus === 'wall_1' ? 2 : 1;
        
        if (consecutiveFails >= 2) {
            nextStatus = 'deload';
            const rawWeight = actualWeight * 0.9;
            nextWeight = Math.round(rawWeight / increment) * increment;
            reason = `The Wall 🧱 (2x). Plateau erkannt. Auto-Deload um 10% zur aktiven Erholung.`;
        } else {
            nextStatus = 'wall_1';
            nextWeight = actualWeight;
            reason = `The Wall 🔴. Kann passieren. Nächstes Mal gleiches Gewicht, gleiches Ziel.`;
        }
        return { weight: nextWeight, reps: nextReps, progression_status: nextStatus, reason, isPush: false };
    }

    // Fallback Catch-all
    nextStatus = 'mastery';
    nextWeight = actualWeight;
    reason = `Workout gestoppt, aber noch RIR übrig. Wir halten das Gewicht.`;
    return { weight: nextWeight, reps: nextReps, progression_status: nextStatus, reason, isPush: false };
}

// --- PERFORMANCE ANALYSIS ---
export function analyzeSession(currentSession, history, oldPrs = {}) {
    if (!currentSession || !history) return { volumeDelta: 0, intensityDelta: 0, newRecords: [] };
    const currentVolume = currentSession.volume || 0;
    
    let totalReps = 0;
    currentSession.logs.forEach(log => {
        log.sets.forEach(s => {
            if (s.completed) totalReps += (parseFloat(s.reps) || 0);
        });
    });

    const now = new Date();
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(now.getDate() - 28);
    const recentSessions = history.filter(h => new Date(h.endTime) > fourWeeksAgo && h.id !== currentSession.id);

    let avgVolume = 0;
    if (recentSessions.length > 0) {
        const totalRecentVol = recentSessions.reduce((acc, s) => acc + (s.volume || 0), 0);
        avgVolume = totalRecentVol / recentSessions.length;
    }

    const volumeDelta = avgVolume > 0 ? Math.round(((currentVolume - avgVolume) / avgVolume) * 100) : 100;

    const newRecords = [];
    currentSession.logs.forEach(log => {
        if (!log.exerciseId) return;
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

    return { volumeDelta, intensityDelta: 0, newRecords };
}

function getSessionVolume(session) {
    if (!session.sets) return 0;
    return session.sets.reduce((total, set) => total + (set.weight * set.reps), 0);
}

function roundToStep(value, step = 1.25) {
    return Math.round(value / step) * step;
}
