
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
// XP Required to hit Level 100 exactly (Sum of AP series)
// L1->2=500, L2->3=600 ... L99->100
// This is used to calculate the "Head Start" for Prestige (Amount > Level 100)
export const XP_TO_LEVEL_100 = 534600;
export const MAX_LEVEL = 1000;

/**
 * Calculates user level based on standard XP curve (Arithmetic Progression).
 * Formula: Level L requires TotalXP(L)
 * L1 -> 0 XP
 * L2 -> 500 XP (Diff 500)
 * ...
 * Max Level: 1000
 * @param {number} xp - Should be 'cycle_xp' (resets on prestige).
 */
export function calculateLevel(xp) {
    if (!xp || xp < 0) return 1;

    let level = 1;
    let requiredForNext = 500;
    let currentTotal = 0;

    // Iterative calculation capped at 1000
    while (xp >= currentTotal + requiredForNext) {
        currentTotal += requiredForNext;
        level++;
        requiredForNext += 100; // Increase requirement by 100 each level

        // HARD CAP AT LEVEL 1000
        if (level >= MAX_LEVEL) return MAX_LEVEL;
    }

    return level;
}

/**
 * Calculates progress towards the next level using cycle_xp.
 * Handles Level 1000 (Max) State.
 * @param {number} xp - The user's 'cycle_xp'.
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

        // Check for Max Level
        if (level >= MAX_LEVEL) {
            break;
        }
    }

    if (level === MAX_LEVEL) {
        return {
            currentLevel: MAX_LEVEL,
            nextLevel: 'MAX',
            progress: 100, // Visual progress full
            totalNeeded: 100, // Dummy value
            xpForNext: xp,
            percent: 100,
            isMaxLevel: true,
            overflow: 0
        };
    }

    const currentLevel = level;
    const nextLevel = level + 1;
    const xpForCurrent = accumulated;
    const xpForNext = accumulated + step;
    const totalNeeded = step; // The size of the current bar
    const progress = xp - xpForCurrent;

    // isMaxLevel is technically for UI "Gold Bar" state.
    // If we want Gold Bar at Lvl 100+, we can check >= 100.
    // But conceptually 'Max' usually means 'Cap'.
    // Let's add a separate flag 'isPrestigeReady' for UI.
    const isPrestigeReady = currentLevel >= 100;

    return {
        currentLevel,
        nextLevel,
        progress,
        totalNeeded,
        xpForNext,
        percent: Math.min(100, Math.max(0, (progress / totalNeeded) * 100)),
        isMaxLevel: currentLevel >= MAX_LEVEL, // Only true true max
        isPrestigeReady, // New flag for UI
        overflow: 0
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
        // Anti-Cheat: Cap Volume to reasonable limit (e.g., 100,000kg)
        const cappedVolume = Math.min(sessionData.volume, 100000);

        let volXP = Math.floor(cappedVolume * 0.05 * mult.volume);

        // Anti-Cheat: Cap Max Volume XP (e.g. 2000 XP)
        if (volXP > 2000) volXP = 2000;

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

        // Anti-Cheat: Cap Cardio XP
        if (cardioXP > 1500) cardioXP = 1500;

        if (cardioXP > 0) {
            xp += cardioXP;
            breakdown.push({ label: `Cardio Bonus (x${mult.cardio})`, value: cardioXP });
        }
    }

    // 3. PR Bonus
    if (sessionData.prs && sessionData.prs > 0) {
        // Cap PRs to 5 per session to prevent spamming fake PRs
        const validPRs = Math.min(sessionData.prs, 5);
        const prXP = (validPRs * XP_EVENTS.PR_HIT);
        xp += prXP;
        breakdown.push({ label: `PR Bonus (${validPRs}x)`, value: prXP });
    }

    // 4. Streak Bonus
    if (sessionData.streak && sessionData.streak > 3) {
        const streakBonus = Math.floor(xp * (XP_EVENTS.STREAK_BONUS - 1)); // Just the bonus part
        xp += streakBonus;
        breakdown.push({ label: 'Streak Bonus (+20%)', value: streakBonus });
    }

    // HARD CAP for entire session (e.g. 5000 XP)
    if (xp > 5000) {
        xp = 5000;
        breakdown.push({ label: 'Session Cap Reached', value: 0 }); // Visual indicator
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
    if (lvl >= 100) return { eligible: true };
    return { eligible: false, reason: 'level_too_low' };
}

export const PRESTIGE_TITLES = {
    1: "PROSPECT",
    2: "HAZARD",
    3: "UNCHAINED",
    4: "GRIND",
    5: "REAPER",
    6: "BERSERKER",
    7: "VANGUARD",
    8: "IMPERATOR",
    9: "PHANTOM",
    10: "LEGION",
    11: "TITAN",
    12: "APEX"
};

export const PRESTIGE_DESCRIPTIONS = {
    1: "The Base. Solid start.",
    2: "Toxic to the average.",
    3: "The Beast is free.",
    4: "Pure Willpower.",
    5: "Reap what you sow.",
    6: "Nordic Fury.",
    7: "Technical & Strong.",
    8: "The Conqueror.",
    9: "Silent & Deadly.",
    10: "One Man Army.",
    11: "Unstoppable Force.",
    12: "The Absolute Peak."
};

export function getPrestigeTitle(level) {
    return PRESTIGE_TITLES[level] || "INITIATE";
}
