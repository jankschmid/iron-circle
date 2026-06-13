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

    const trackingType = assignment?.exerciseDef?.tracking_type || 'WEIGHT_REPS';

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

    const dbIncrement = assignment?.exerciseDef?.default_increment ? parseFloat(assignment.exerciseDef.default_increment) : null;

    // --- NON-WEIGHT TRACKING TYPES ---
    if (trackingType === 'TIME_DISTANCE') {
        const increment = dbIncrement || 0.5; // default 0.5 km/mi increment
        const topSet = setsArray.reduce((prev, curr) => (parseFloat(curr.distance) || 0) > (parseFloat(prev.distance) || 0) ? curr : prev, setsArray[0]);
        const actualDist = parseFloat(topSet.distance || 0);
        const actualDur = parseFloat(topSet.duration || 0);
        const rpe = topSet.rpe || 7;
        const currentStatus = topSet.progression_status || 'unknown';
        
        let nextDist = actualDist;
        let nextDur = actualDur;
        let reason = '';
        let nextStatus = 'mastery';
        let isPush = false;
        
        if (rpe <= 7 && actualDist > 0) {
            nextStatus = 'level_up';
            nextDist = parseFloat((actualDist + increment).toFixed(2));
            reason = `Sweet Spot 🎯 (RPE ${rpe}). Wir steigern die Zieldistanz um +${increment}.`;
            isPush = true;
        } else if (rpe >= 8 && rpe <= 9) {
            nextStatus = 'mastery';
            reason = `The Grind 😅 (RPE ${rpe}). Ausdauer-Limit erreicht. Wir konsolidieren diese Distanz.`;
        } else if (rpe >= 10 || actualDist === 0) {
            let consecutiveFails = currentStatus === 'wall_1' ? 2 : 1;
            if (consecutiveFails >= 2) {
                nextStatus = 'deload';
                nextDist = parseFloat(Math.max(0, actualDist * 0.9).toFixed(2));
                reason = `The Wall 🧱 (2x). Wir reduzieren die Distanz um 10% zur aktiven Erholung.`;
            } else {
                nextStatus = 'wall_1';
                reason = `The Wall 🔴 (RPE ${rpe}). Nächstes Mal gleiche Distanz, gleiches Ziel.`;
            }
        } else {
            reason = "Workout beendet. Wir halten das aktuelle Level.";
        }

        return { distance: nextDist, duration: nextDur, weight: 0, reps: 0, progression_status: nextStatus, reason, isPush };
    }

    if (trackingType === 'TIME_ONLY') {
        const increment = dbIncrement || 15; // default +15 seconds
        const topSet = setsArray.reduce((prev, curr) => (parseFloat(curr.duration) || 0) > (parseFloat(prev.duration) || 0) ? curr : prev, setsArray[0]);
        const actualDur = parseFloat(topSet.duration || 0);
        const rpe = topSet.rpe || 7;
        const currentStatus = topSet.progression_status || 'unknown';
        
        let nextDur = actualDur;
        let reason = '';
        let nextStatus = 'mastery';
        let isPush = false;
        
        if (rpe <= 7 && actualDur > 0) {
            nextStatus = 'level_up';
            nextDur = actualDur + increment;
            reason = `Sweet Spot 🎯 (RPE ${rpe}). Wir hängen +${increment} Sekunden dran!`;
            isPush = true;
        } else if (rpe >= 8 && rpe <= 9) {
            nextStatus = 'mastery';
            reason = `The Grind 😅 (RPE ${rpe}). Haltezeit bestätigt. Wir konsolidieren die Zeit.`;
        } else if (rpe >= 10 || actualDur === 0) {
            let consecutiveFails = currentStatus === 'wall_1' ? 2 : 1;
            if (consecutiveFails >= 2) {
                nextStatus = 'deload';
                nextDur = Math.floor(Math.max(0, actualDur * 0.9));
                reason = `The Wall 🧱 (2x). Wir nehmen 10% der Zeit weg, um das ZNS zu erholen.`;
            } else {
                nextStatus = 'wall_1';
                reason = `The Wall 🔴 (RPE ${rpe}). Limit erreicht. Wir peilen die gleiche Haltezeit an.`;
            }
        } else {
            reason = "Workout beendet. Haltezeit bestätigt.";
        }

        return { duration: nextDur, weight: 0, reps: 0, progression_status: nextStatus, reason, isPush };
    }

    if (trackingType === 'REPS_ONLY') {
        const increment = dbIncrement || 2; // default +2 reps
        const topSet = setsArray.reduce((prev, curr) => (parseFloat(curr.reps) || 0) > (parseFloat(prev.reps) || 0) ? curr : prev, setsArray[0]);
        const actualReps = parseFloat(topSet.reps || 0);
        const rir = topSet.rir !== undefined && topSet.rir !== null ? parseFloat(topSet.rir) : (actualReps >= 10 ? 2 : 0);
        const currentStatus = topSet.progression_status || 'unknown';

        let nextReps = actualReps;
        let reason = '';
        let nextStatus = 'mastery';
        let isPush = false;

        if (rir >= 3) {
            nextStatus = 'spike';
            nextReps = actualReps + increment + 1;
            reason = `Hulk-Ausreißer! 💥 Übung fiel super leicht. Wir pushen Ziel-Reps hoch (+${increment + 1}).`;
            isPush = true;
        } else if (rir >= 2) {
            nextStatus = 'level_up';
            nextReps = actualReps + increment;
            reason = `Sweet Spot 🎯. Fühlt sich gut an. Ziel-Reps auf ${nextReps} erhöht (+${increment}).`;
            isPush = true;
        } else if (rir === 1) {
            nextStatus = 'mastery';
            reason = `The Grind 😅. Nah am Muskelversagen. Wir bestätigen die aktuellen Reps.`;
        } else if (rir === 0 || actualReps === 0) {
            let consecutiveFails = currentStatus === 'wall_1' ? 2 : 1;
            if (consecutiveFails >= 2) {
                nextStatus = 'deload';
                nextReps = Math.floor(Math.max(1, actualReps * 0.9));
                reason = `The Wall 🧱 (2x). Wir reduzieren das Rep-Ziel leicht zur Erholung.`;
            } else {
                nextStatus = 'wall_1';
                reason = `The Wall 🔴 (RIR 0). Limit. Nächstes Mal gleiche Reps.`;
            }
        } else {
            reason = "Reps bestätigt.";
        }

        return { reps: nextReps, weight: 0, progression_status: nextStatus, reason, isPush };
    }

    // --- WEIGHT & REPS (DEFAULT LOGIC) ---
    const goal = parseGoal(assignment?.targetGoal, assignment?.userRepRange);
    const targetReps = goal.targetReps;
    
    const equip = assignment?.exerciseDef?.equipment_type || 'barbell';
    let increment = dbIncrement;
    if (!increment) {
        if (equip === 'cable' || equip === 'machine' && assignment?.exerciseDef?.name?.toLowerCase().includes('raise') ) increment = 1.25;
        else if (equip === 'machine') increment = 2.5;
        else increment = 2.5;
    }

    const topSet = getBestSet(setsArray);
    const actualReps = parseFloat(topSet.reps || 0);
    const actualWeight = parseFloat(topSet.weight || 0);
    
    let rir = topSet.rir !== undefined && topSet.rir !== null ? parseFloat(topSet.rir) : null;
    if (rir == null) {
        rir = actualReps >= targetReps ? 2 : 0;
    }

    const currentStatus = topSet.progression_status || 'unknown';

    let nextWeight = actualWeight;
    let nextReps = targetReps;
    let nextStatus = 'level_up';
    let reason = '';

    if (actualReps >= targetReps + 3) {
        nextStatus = 'spike';
        nextWeight = actualWeight + increment;
        reason = `Hulk-Ausreißer! 💥 Gedeckelt auf Ziel-Reps, wir steigern um +${increment}kg.`;
        return { weight: nextWeight, reps: nextReps, progression_status: nextStatus, reason, isPush: true };
    }

    if (actualReps >= targetReps && rir >= 2) {
        nextStatus = 'level_up';
        nextWeight = actualWeight + increment;
        reason = `Sweet Spot 🎯! Gewicht war kontrollierbar. Level Up +${increment}kg.`;
        return { weight: nextWeight, reps: nextReps, progression_status: nextStatus, reason, isPush: true };
    }

    if (actualReps >= targetReps && rir <= 1) {
        nextStatus = 'mastery';
        nextWeight = actualWeight;
        reason = `The Grind 😅. Ziel erreicht, aber am Limit. Nächstes Mal nochmal sauber (Ziel: RIR 2).`;
        return { weight: nextWeight, reps: nextReps, progression_status: nextStatus, reason, isPush: false };
    }

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

// --- 1RM & PR INTELLIGENCE ---

/**
 * Estimates 1 Rep Max using the Epley formula.
 * Accurate above 5 reps, exact at 1 rep.
 */
export function estimate1RM(weight, reps) {
    const w = parseFloat(weight) || 0;
    const r = parseFloat(reps) || 0;
    if (w <= 0 || r <= 0) return 0;
    if (r === 1) return w;
    return Math.round(w * (1 + r / 30));
}

/**
 * Calculates personal records from workout history.
 * Returns top PRs sorted by estimated 1RM descending.
 * Each PR: { exerciseId, exerciseName, weight, reps, estimated1RM, date, isRecent }
 */
export function calculatePRs(history, exercises) {
    if (!history || history.length === 0) return [];

    const prMap = {}; // exerciseId → best set info
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    history.forEach(session => {
        const sessionDate = session.endTime ? new Date(session.endTime) : null;
        (session.logs || []).forEach(log => {
            if (!log.exerciseId) return;
            (log.sets || []).filter(s => s.completed).forEach(set => {
                const w = parseFloat(set.weight) || 0;
                const r = parseFloat(set.reps) || 0;
                if (w <= 0 || r <= 0) return;

                const e1rm = estimate1RM(w, r);
                const existing = prMap[log.exerciseId];

                if (!existing || e1rm > existing.estimated1RM) {
                    prMap[log.exerciseId] = {
                        exerciseId: log.exerciseId,
                        weight: w,
                        reps: r,
                        estimated1RM: e1rm,
                        date: sessionDate,
                        isRecent: sessionDate && sessionDate > thirtyDaysAgo
                    };
                }
            });
        });
    });

    // Enrich with exercise names
    return Object.values(prMap)
        .map(pr => {
            const ex = (exercises || []).find(e => e.id === pr.exerciseId);
            return { ...pr, exerciseName: ex?.name || pr.exerciseId };
        })
        .filter(pr => pr.exerciseName && pr.weight > 0)
        .sort((a, b) => b.estimated1RM - a.estimated1RM);
}

/**
 * Detects a plateau for a given exercise across recent sessions.
 * Returns true if no weight improvement over the last 4 weeks (min 2 sessions).
 */
export function detectPlateau(history, exerciseId) {
    if (!history || history.length === 0) return false;

    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentSets = [];
    history
        .filter(s => s.endTime && new Date(s.endTime) >= fourWeeksAgo)
        .forEach(session => {
            (session.logs || [])
                .filter(l => l.exerciseId === exerciseId)
                .forEach(log => {
                    (log.sets || []).filter(s => s.completed).forEach(set => {
                        const w = parseFloat(set.weight) || 0;
                        if (w > 0) recentSets.push(w);
                    });
                });
        });

    if (recentSets.length < 4) return false; // not enough data
    const firstHalf = recentSets.slice(0, Math.floor(recentSets.length / 2));
    const secondHalf = recentSets.slice(Math.floor(recentSets.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    return avgSecond <= avgFirst; // no improvement
}
