
/**
 * IronCircle Gamification Logic
 */

export const XP_EVENTS = {
    WORKOUT_COMPLETE: 100,
    GYM_CHECKIN: 20, // Passive tracker session
    PR_HIT: 250,      // Per PR in a session
    STREAK_BONUS: 1.2, // Multiplier
    REFERRAL: 200
};

// MULTIPLIERS BASED ON GOAL
// Strength: Loves heavy weights (Volume), hates cardio.
// Endurance: Loves cardio, weights are secondary.
// Weight Loss: Cardio is key, consistency is key.
// Muscle: Balanced / standard.
export const GOAL_MULTIPLIERS = {
    'Strength': { volume: 1.2, cardio: 0.5 },
    'Endurance': { volume: 0.5, cardio: 2.0 },
    'Weight Loss': { volume: 1.0, cardio: 1.5 },
    'Muscle': { volume: 1.0, cardio: 1.0 } // Default
};

/**
 * Calculates user level based on total XP using an Arithmetic Progression.
 * Formula: Level L requires TotalXP(L)
 * L1 -> 0 XP
 * L2 -> 500 XP (Diff 500)
 * L3 -> 1100 XP (Diff 600)
 * L4 -> 1800 XP (Diff 700)
 * ...
 * Diff(L) = 500 + (L-2)*100
 * TotalXP(L) = Sum of Diffs
 */
export function calculateLevel(xp) {
    if (!xp || xp < 0) return 1;

    let level = 1;
    let requiredForNext = 500;
    let currentTotal = 0;

    // Iterative calculation (safe for max level 50)
    // We could use quadratic formula for O(1) but loop is fine here.
    while (xp >= currentTotal + requiredForNext) {
        currentTotal += requiredForNext;
        level++;
        requiredForNext += 100; // Increase requirement by 100 each level
    }

    return level;
}

/**
 * Calculates progress towards the next level.
 */
export function getLevelProgress(xp) {
    if (!xp || xp < 0) xp = 0;

    let level = 1;
    let step = 500;
    let accumulated = 0;

    // Find current level
    while (xp >= accumulated + step) {
        accumulated += step;
        level++;
        step += 100;
    }

    const currentLevel = level;
    const nextLevel = level + 1;
    const xpForCurrent = accumulated;
    const xpForNext = accumulated + step;
    const totalNeeded = step; // The size of the current bar
    const progress = xp - xpForCurrent;

    return {
        currentLevel,
        nextLevel,
        progress,
        totalNeeded, // Variable now (500, 600, 700...)
        xpForNext,
        percent: Math.min(100, Math.max(0, (progress / totalNeeded) * 100))
    };
}

/**
 * Helper to calculate XP for a finished session with Goal Multipliers
 */
export function calculateSessionXP(sessionData, userGoal = 'Muscle') {
    let xp = XP_EVENTS.WORKOUT_COMPLETE;
    const breakdown = [];

    breakdown.push({ label: 'Base Workout', value: XP_EVENTS.WORKOUT_COMPLETE });

    // Get Multipliers
    const mult = GOAL_MULTIPLIERS[userGoal] || GOAL_MULTIPLIERS['Muscle'];

    // 1. Volume Bonus (Strength)
    if (sessionData.volume > 0) {
        let volXP = Math.floor(sessionData.volume * 0.05 * mult.volume);
        xp += volXP;
        breakdown.push({ label: `Volume Bonus (x${mult.volume})`, value: volXP });
    }

    // 2. Cardio Bonus
    if (sessionData.cardio) {
        const { distance, duration } = sessionData.cardio;
        let cardioXP = 0;
        if (distance > 0) cardioXP += Math.floor(distance * 100); // 1km = 100xp
        if (duration > 0) cardioXP += Math.floor(duration * 2);   // 1min = 2xp

        // Apply Multiplier
        cardioXP = Math.floor(cardioXP * mult.cardio);

        if (cardioXP > 0) {
            xp += cardioXP;
            breakdown.push({ label: `Cardio Bonus (x${mult.cardio})`, value: cardioXP });
        }
    }

    // 3. PR Bonus
    if (sessionData.prs && sessionData.prs > 0) {
        const prXP = (sessionData.prs * XP_EVENTS.PR_HIT);
        xp += prXP;
        breakdown.push({ label: `PR Bonus (${sessionData.prs}x)`, value: prXP });
    }

    // 4. Streak Bonus
    if (sessionData.streak && sessionData.streak > 3) {
        const streakBonus = Math.floor(xp * (XP_EVENTS.STREAK_BONUS - 1)); // Just the bonus part
        xp += streakBonus;
        breakdown.push({ label: 'Streak Bonus (+20%)', value: streakBonus });
    }

    return { total: xp, breakdown };
}

/**
 * Checks if user is eligible for Prestige.
 * Max Level: 50
 * Max Prestige: 12
 */
export function checkPrestigeEligible(level, prestigeLevel) {
    const lvl = Number(level) || 0;
    const pl = Number(prestigeLevel) || 0;

    if (pl >= 12) return { eligible: false, reason: 'max_rank' };
    if (lvl >= 50) return { eligible: true };
    return { eligible: false, reason: 'level_too_low' };
}
