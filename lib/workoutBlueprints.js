// lib/workoutBlueprints.js

/**
 * Exercise dictionaries by Training Style
 * Mapped to existing exercise IDs in EXERCISES (lib/data.js)
 */
const EXERCISE_POOLS = {
    Bodybuilding: {
        push: ['bench_press', 'incline_bench_press', 'shoulder_press', 'lateral_raises', 'triceps_pushdown', 'chest_fly'],
        pull: ['lat_pulldown', 'barbell_row', 'pull_ups', 'bicep_curls', 'hammer_curl', 'face_pulls'],
        legs: ['squat', 'leg_press', 'romanian_deadlift', 'leg_extension', 'leg_curl', 'calf_raises'],
        core: ['cable_crunch', 'hanging_leg_raises']
    },
    Powerlifting: {
        push: ['bench_press', 'overhead_press', 'close_grip_bench_press', 'dips', 'triceps_pushdown'],
        pull: ['deadlift', 'barbell_row', 'pull_ups', 't_bar_row', 'bicep_curls'],
        legs: ['squat', 'front_squat', 'romanian_deadlift', 'leg_press', 'calf_raises'],
        core: ['plank', 'ab_wheel_rollout']
    },
    Calisthenics: {
        push: ['push_ups', 'dips', 'handstand_push_ups', 'pike_pushups'], // missing some, fallback to standard ids if needed
        pull: ['pull_ups', 'chin_ups', 'muscle_up', 'front_lever'],
        legs: ['pistol_squat', 'lunges', 'bulgarian_split_squat', 'squat', 'calf_raises'],
        core: ['dragon_flags', 'human_flag', 'hanging_leg_raises', 'plank']
    },
    Crossfit: {
        push: ['push_ups', 'shoulder_press', 'dips', 'bench_press'],
        pull: ['pull_ups', 'deadlift', 'muscle_up', 'rowing'],
        legs: ['front_squat', 'squat', 'box_jumps', 'lunges', 'running'],
        core: ['ab_wheel_rollout', 'russian_twists', 'jump_rope']
    },
    Endurance: {
        push: ['push_ups', 'bench_press', 'shoulder_press', 'triceps_pushdown'],
        pull: ['rowing', 'lat_pulldown', 'pull_ups', 'bicep_curls'],
        legs: ['running', 'cycling', 'lunges', 'squat', 'calf_raises'],
        core: ['plank', 'crunches', 'russian_twists']
    },
    'General Fitness': {
        push: ['bench_press', 'push_ups', 'shoulder_press', 'lateral_raises', 'triceps_pushdown'],
        pull: ['lat_pulldown', 'dumbbell_row', 'bicep_curls', 'face_pulls'],
        legs: ['squat', 'leg_press', 'lunges', 'calf_raises'],
        core: ['plank', 'crunches']
    }
};

/**
 * Creates an exercise object for a template with a specific number of sets and reps.
 */
function createExercise(exerciseId, setsCount, repRange, isCompleted = false) {
    if (!exerciseId) return null;
    const sets = [];
    for (let i = 0; i < setsCount; i++) {
        sets.push({ weight: 0, reps: repRange, completed: isCompleted });
    }
    return { id: exerciseId, sets };
}

/**
 * Grabs requested number of exercises from the pool safely
 */
function getFromPool(pool, category, count) {
    const list = pool[category] || [];
    return list.slice(0, count);
}

/**
 * Generates structured templates based on frequency and style.
 * 
 * @param {Object} userProfile - Should contain: training_style, rep_range_min, rep_range_max, yearly_workout_goal
 * @returns {Array} List of workout templates ready to be inserted
 */
export function generateStarterRoutines(userProfile) {
    const style = userProfile.training_style || 'General Fitness';
    const repMin = userProfile.rep_range_min || 8;
    const repMax = userProfile.rep_range_max || 12;
    // Format rep target string (e.g., "8" or "8-12" just as placeholder for generator, but we'll use max as the target for the set model)
    const reps = repMax;

    // Default to general fitness if style not mapped (shouldn't happen with our UI but just in case)
    const pool = EXERCISE_POOLS[style] || EXERCISE_POOLS['General Fitness'];

    // Calculate weekly frequency based on yearly goal
    const yearlyGoal = userProfile.yearly_workout_goal || 104; // 104 is ~2x a week
    const weeklyFrequency = Math.round(yearlyGoal / 52);

    const templates = [];

    // --- FREQUENCY 1-2x/week -> FULL BODY ---
    if (weeklyFrequency <= 2) {
        templates.push({
            name: `${style} Full Body A`,
            description: 'A complete full body workout targeting all major muscle groups.',
            exercises: [
                createExercise(getFromPool(pool, 'legs', 1)[0], 3, reps),
                createExercise(getFromPool(pool, 'push', 1)[0], 3, reps),
                createExercise(getFromPool(pool, 'pull', 1)[0], 3, reps),
                createExercise(getFromPool(pool, 'push', 2)[1], 2, reps), // accessory push
                createExercise(getFromPool(pool, 'pull', 2)[1], 2, reps), // accessory pull
                createExercise(getFromPool(pool, 'core', 1)[0], 2, reps)
            ].filter(Boolean)
        });

        if (weeklyFrequency === 2) {
            templates.push({
                name: `${style} Full Body B`,
                description: 'A secondary full body workout targeting all major muscle groups with variations.',
                exercises: [
                    createExercise(getFromPool(pool, 'legs', 2)[1], 3, reps),
                    createExercise(getFromPool(pool, 'pull', 3)[2] || getFromPool(pool, 'pull', 1)[0], 3, reps),
                    createExercise(getFromPool(pool, 'push', 3)[2] || getFromPool(pool, 'push', 1)[0], 3, reps),
                    createExercise(getFromPool(pool, 'legs', 3)[2] || getFromPool(pool, 'legs', 1)[0], 2, reps),
                    createExercise(getFromPool(pool, 'core', 2)[1] || getFromPool(pool, 'core', 1)[0], 2, reps)
                ].filter(Boolean)
            });
        }
    }
    // --- FREQUENCY 3x/week -> PUSH / PULL / LEGS ---
    else if (weeklyFrequency === 3) {
        templates.push({
            name: `${style} Push`,
            description: 'Chest, Shoulders & Triceps focus.',
            exercises: [
                createExercise(getFromPool(pool, 'push', 1)[0], 4, reps),
                createExercise(getFromPool(pool, 'push', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'push', 3)[2], 3, reps),
                createExercise(getFromPool(pool, 'push', 4)[3], 3, reps),
                createExercise(getFromPool(pool, 'push', 5)[4], 3, reps)
            ].filter(Boolean)
        });
        templates.push({
            name: `${style} Pull`,
            description: 'Back, Biceps & Rear Delts focus.',
            exercises: [
                createExercise(getFromPool(pool, 'pull', 1)[0], 4, reps),
                createExercise(getFromPool(pool, 'pull', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'pull', 3)[2], 3, reps),
                createExercise(getFromPool(pool, 'pull', 4)[3], 3, reps),
                createExercise(getFromPool(pool, 'pull', 5)[4], 3, reps)
            ].filter(Boolean)
        });
        templates.push({
            name: `${style} Legs`,
            description: 'Quads, Hamstrings, Glutes & Calves.',
            exercises: [
                createExercise(getFromPool(pool, 'legs', 1)[0], 4, reps),
                createExercise(getFromPool(pool, 'legs', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'legs', 3)[2], 3, reps),
                createExercise(getFromPool(pool, 'legs', 4)[3], 3, reps),
                createExercise(getFromPool(pool, 'core', 1)[0], 3, reps)
            ].filter(Boolean)
        });
    }
    // --- FREQUENCY 4x/week -> UPPER / LOWER (x2) ---
    else if (weeklyFrequency === 4) {
        templates.push({
            name: `${style} Upper A`,
            description: 'Upper body power & strength focus.',
            exercises: [
                createExercise(getFromPool(pool, 'push', 1)[0], 4, reps),
                createExercise(getFromPool(pool, 'pull', 1)[0], 4, reps),
                createExercise(getFromPool(pool, 'push', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'pull', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'push', 3)[2], 2, reps)
            ].filter(Boolean)
        });
        templates.push({
            name: `${style} Lower A`,
            description: 'Lower body power & strength focus.',
            exercises: [
                createExercise(getFromPool(pool, 'legs', 1)[0], 4, reps),
                createExercise(getFromPool(pool, 'legs', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'legs', 3)[2], 3, reps),
                createExercise(getFromPool(pool, 'core', 1)[0], 3, reps)
            ].filter(Boolean)
        });
        templates.push({
            name: `${style} Upper B`,
            description: 'Upper body hypertrohpy & volume focus.',
            exercises: [
                createExercise(getFromPool(pool, 'pull', 3)[2] || getFromPool(pool, 'pull', 1)[0], 3, reps),
                createExercise(getFromPool(pool, 'push', 4)[3] || getFromPool(pool, 'push', 1)[0], 3, reps),
                createExercise(getFromPool(pool, 'pull', 4)[3] || getFromPool(pool, 'pull', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'push', 5)[4] || getFromPool(pool, 'push', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'core', 2)[1] || getFromPool(pool, 'core', 1)[0], 2, reps)
            ].filter(Boolean)
        });
        templates.push({
            name: `${style} Lower B`,
            description: 'Lower body hypertrophy & volume focus.',
            exercises: [
                createExercise(getFromPool(pool, 'legs', 4)[3] || getFromPool(pool, 'legs', 1)[0], 4, reps),
                createExercise(getFromPool(pool, 'legs', 5)[4] || getFromPool(pool, 'legs', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'legs', 1)[0], 3, reps),
                createExercise(getFromPool(pool, 'core', 1)[0], 3, reps)
            ].filter(Boolean)
        });
    }
    // --- FREQUENCY 5-6x/week -> PPL + UPPER / LOWER (Hybrid) ---
    else {
        // Just gives 5 variations
        templates.push({
            name: `${style} Push`,
            description: 'Chest, Shoulders & Triceps.',
            exercises: [
                createExercise(getFromPool(pool, 'push', 1)[0], 4, reps),
                createExercise(getFromPool(pool, 'push', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'push', 4)[3], 3, reps),
                createExercise(getFromPool(pool, 'push', 5)[4], 3, reps)
            ].filter(Boolean)
        });
        templates.push({
            name: `${style} Pull`,
            description: 'Back, Biceps & Rear Delts.',
            exercises: [
                createExercise(getFromPool(pool, 'pull', 1)[0], 4, reps),
                createExercise(getFromPool(pool, 'pull', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'pull', 4)[3], 3, reps),
                createExercise(getFromPool(pool, 'pull', 5)[4], 3, reps)
            ].filter(Boolean)
        });
        templates.push({
            name: `${style} Legs`,
            description: 'Quads, Hamstrings & Calves.',
            exercises: [
                createExercise(getFromPool(pool, 'legs', 1)[0], 4, reps),
                createExercise(getFromPool(pool, 'legs', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'legs', 3)[2], 3, reps),
                createExercise(getFromPool(pool, 'legs', 4)[3], 3, reps)
            ].filter(Boolean)
        });
        templates.push({
            name: `${style} Upper Body`,
            description: 'Upper body secondary day.',
            exercises: [
                createExercise(getFromPool(pool, 'push', 3)[2] || getFromPool(pool, 'push', 1)[0], 3, reps),
                createExercise(getFromPool(pool, 'pull', 3)[2] || getFromPool(pool, 'pull', 1)[0], 3, reps),
                createExercise(getFromPool(pool, 'push', 6)[5] || getFromPool(pool, 'push', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'pull', 6)[5] || getFromPool(pool, 'pull', 2)[1], 3, reps)
            ].filter(Boolean)
        });
        templates.push({
            name: `${style} Lower Body & Core`,
            description: 'Lower body secondary day + Core.',
            exercises: [
                createExercise(getFromPool(pool, 'legs', 5)[4] || getFromPool(pool, 'legs', 1)[0], 3, reps),
                createExercise(getFromPool(pool, 'legs', 6)[5] || getFromPool(pool, 'legs', 2)[1], 3, reps),
                createExercise(getFromPool(pool, 'core', 1)[0], 3, reps),
                createExercise(getFromPool(pool, 'core', 2)[1] || getFromPool(pool, 'core', 1)[0], 3, reps)
            ].filter(Boolean)
        });
    }

    return templates;
}
