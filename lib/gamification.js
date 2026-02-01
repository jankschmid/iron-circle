
/**
 * IronCircle Gamification Logic
 */

export const XP_EVENTS = {
    WORKOUT_COMPLETE: 100,
    GYM_CHECKIN: 20, // Passive tracker session
    PR_HIT: 50,      // Per PR in a session
    STREAK_BONUS: 10, // Multiplied by streak days (capped?)
    REFERRAL: 200
};

/**
 * Calculates user level based on total XP.
 * Formula: XP = (Level-1)^2 * 100
 * Level = sqrt(XP / 100) + 1
 */
export function calculateLevel(xp) {
    if (!xp || xp < 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * Calculates progress towards the next level.
 */
export function getLevelProgress(xp) {
    const currentLevel = calculateLevel(xp);
    const nextLevel = currentLevel + 1;

    const xpForCurrent = Math.pow(currentLevel - 1, 2) * 100;
    const xpForNext = Math.pow(nextLevel - 1, 2) * 100;

    const progress = xp - xpForCurrent;
    const totalNeeded = xpForNext - xpForCurrent;

    return {
        currentLevel,
        nextLevel,
        progress,
        totalNeeded,
        xpForNext,
        percent: Math.min(100, Math.max(0, (progress / totalNeeded) * 100))
    };
}

/**
 * Helper to calculate XP for a finished session
 */
export function calculateSessionXP(sessionData) {
    let xp = XP_EVENTS.WORKOUT_COMPLETE;

    // Add PRs
    if (sessionData.prs && sessionData.prs > 0) {
        xp += (sessionData.prs * XP_EVENTS.PR_HIT);
    }

    // Add Streak Bonus (capped at 500?)
    if (sessionData.streak) {
        const bonus = Math.min(500, sessionData.streak * XP_EVENTS.STREAK_BONUS);
        xp += bonus;
    }

    return xp;
}
