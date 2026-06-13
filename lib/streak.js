export function getStreakInfo(user) {
    if (!user) return null;

    const streakCount = user.current_streak ?? user.streak ?? 0;

    if (user.streak_status === 'frozen') {
        return { isFrozen: true, isLost: false, isReadyToStart: false, deadlineDate: null, streakCount };
    }

    if (!user.last_workout_date && streakCount === 0) {
        return { isFrozen: false, isLost: false, isReadyToStart: true, deadlineDate: null, streakCount: 0 };
    }

    const yearlyGoal = user.yearly_workout_goal || 104;
    const w = Math.max(yearlyGoal / 52, 1);
    const graceHours = (7 / w) * 24 + 24;

    const lastWorkout = new Date(user.last_workout_date);
    const deadlineDate = new Date(lastWorkout.getTime() + graceHours * 3600 * 1000);

    const now = new Date();
    const diffMs = deadlineDate - now;

    const isLost = diffMs <= 0;

    return {
        isFrozen: false,
        isLost,
        isReadyToStart: false,
        deadlineDate,
        streakCount: isLost ? 0 : streakCount
    };
}
