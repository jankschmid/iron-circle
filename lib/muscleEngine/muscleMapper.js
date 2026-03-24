/**
 * muscleMapper.js
 * Maps exercise names/muscle group keys → specific SVG path IDs.
 * Handles overlapping muscles (e.g. lats appear in both front and rear).
 * 
 * Available SVG IDs:
 *   Front: chest, delts_front, biceps, lat_front, obliques, forearms_front, adductors, quads, calves_front, shins
 *   Rear:  traps, delts_rear, triceps, mid_back, lat_rear, lower_back, glutes, hamstrings, calves_rear, forearms_rear
 */

// Logical muscle group → array of SVG path IDs it lights up
export const MUSCLE_ID_MAP = {
    // Chest
    chest:          ['chest'],
    pecs:           ['chest'],

    // Shoulders
    delts:          ['delts_front', 'delts_rear'],
    shoulders:      ['delts_front', 'delts_rear'],
    delts_front:    ['delts_front'],
    delts_rear:     ['delts_rear'],
    front_delt:     ['delts_front'],
    rear_delt:      ['delts_rear'],

    // Back
    lats:           ['lat_front', 'lat_rear'],
    lat:            ['lat_front', 'lat_rear'],
    traps:          ['traps'],
    mid_back:       ['mid_back'],
    lower_back:     ['lower_back'],
    back:           ['lat_front', 'lat_rear', 'traps', 'mid_back', 'lower_back'],
    upper_back:     ['traps', 'mid_back', 'lat_front', 'lat_rear'],

    // Arms
    biceps:         ['biceps'],
    triceps:        ['triceps'],
    forearms:       ['forearms_front', 'forearms_rear'],
    forearms_front: ['forearms_front'],
    forearms_rear:  ['forearms_rear'],
    arms:           ['biceps', 'triceps', 'forearms_front', 'forearms_rear'],

    // Core
    abs:            ['obliques'],   // map abs to obliques as closest visual
    obliques:       ['obliques'],
    core:           ['obliques'],

    // Legs
    quads:          ['quads'],
    hamstrings:     ['hamstrings'],
    glutes:         ['glutes'],
    adductors:      ['adductors'],
    calves:         ['calves_front', 'calves_rear'],
    calves_front:   ['calves_front'],
    calves_rear:    ['calves_rear'],
    shins:          ['shins'],
    legs:           ['quads', 'hamstrings', 'glutes', 'adductors', 'calves_front', 'calves_rear'],
    lower_body:     ['quads', 'hamstrings', 'glutes', 'adductors', 'calves_front', 'calves_rear'],
};

// Exercise name → primary muscle groups trained
export const EXERCISE_MUSCLE_MAP = {
    // PUSH
    'bench press':          { primary: ['chest', 'triceps'],    secondary: ['delts_front'] },
    'incline bench press':  { primary: ['chest', 'triceps'],    secondary: ['delts_front'] },
    'decline bench press':  { primary: ['chest', 'triceps'],    secondary: ['delts_front'] },
    'push up':              { primary: ['chest', 'triceps'],    secondary: ['delts_front'] },
    'dips':                 { primary: ['chest', 'triceps'],    secondary: ['delts_front'] },
    'chest fly':            { primary: ['chest'],               secondary: [] },
    'cable fly':            { primary: ['chest'],               secondary: [] },
    'overhead press':       { primary: ['delts_front', 'delts_rear'], secondary: ['triceps', 'traps'] },
    'shoulder press':       { primary: ['delts_front'],         secondary: ['triceps', 'traps'] },
    'lateral raise':        { primary: ['delts_rear'],          secondary: ['traps'] },
    'front raise':          { primary: ['delts_front'],         secondary: [] },
    'tricep pushdown':      { primary: ['triceps'],             secondary: [] },
    'skull crusher':        { primary: ['triceps'],             secondary: [] },
    'close grip bench':     { primary: ['triceps', 'chest'],    secondary: ['delts_front'] },

    // PULL
    'pull up':              { primary: ['lats', 'biceps'],      secondary: ['traps', 'mid_back'] },
    'chin up':              { primary: ['lats', 'biceps'],      secondary: ['traps'] },
    'lat pulldown':         { primary: ['lats'],                secondary: ['biceps', 'mid_back'] },
    'cable row':            { primary: ['mid_back', 'lats'],    secondary: ['biceps', 'traps'] },
    'barbell row':          { primary: ['lats', 'mid_back'],    secondary: ['biceps', 'lower_back'] },
    'dumbbell row':         { primary: ['lats', 'mid_back'],    secondary: ['biceps'] },
    'face pull':            { primary: ['delts_rear', 'traps'], secondary: [] },
    'shrugs':               { primary: ['traps'],               secondary: [] },
    'bicep curl':           { primary: ['biceps'],              secondary: ['forearms'] },
    'hammer curl':          { primary: ['biceps', 'forearms'],  secondary: [] },
    'preacher curl':        { primary: ['biceps'],              secondary: [] },
    'deadlift':             { primary: ['lower_back', 'glutes', 'hamstrings'], secondary: ['lats', 'traps', 'quads'] },
    'romanian deadlift':    { primary: ['hamstrings', 'glutes'],secondary: ['lower_back'] },

    // LEGS
    'squat':                { primary: ['quads', 'glutes'],     secondary: ['hamstrings', 'adductors', 'lower_back'] },
    'front squat':          { primary: ['quads'],               secondary: ['glutes', 'adductors'] },
    'leg press':            { primary: ['quads', 'glutes'],     secondary: ['hamstrings'] },
    'lunge':                { primary: ['quads', 'glutes'],     secondary: ['hamstrings', 'adductors'] },
    'hack squat':           { primary: ['quads'],               secondary: ['glutes'] },
    'leg extension':        { primary: ['quads'],               secondary: [] },
    'leg curl':             { primary: ['hamstrings'],          secondary: [] },
    'hip thrust':           { primary: ['glutes', 'hamstrings'],secondary: ['lower_back'] },
    'glute bridge':         { primary: ['glutes'],              secondary: ['hamstrings'] },
    'calf raise':           { primary: ['calves'],              secondary: ['shins'] },
    'seated calf raise':    { primary: ['calves'],              secondary: [] },

    // CORE
    'plank':                { primary: ['core'],                secondary: [] },
    'crunch':               { primary: ['abs'],                 secondary: [] },
    'cable crunch':         { primary: ['abs'],                 secondary: [] },
    'russian twist':        { primary: ['obliques'],            secondary: [] },
    'leg raise':            { primary: ['abs', 'adductors'],    secondary: [] },
    'ab wheel':             { primary: ['abs'],                 secondary: ['lower_back'] },
};

/**
 * Get all SVG path IDs that should be highlighted for a given logical muscle key.
 * @param {string} muscleKey - e.g. "lats", "chest", "delts_front"
 * @returns {string[]} Array of SVG path IDs
 */
export function getSvgIdsForMuscle(muscleKey) {
    const key = muscleKey.toLowerCase().trim();
    return MUSCLE_ID_MAP[key] || [key]; // fallback: treat the key as a direct SVG ID
}

/**
 * Get muscle IDs for an exercise name.
 * @param {string} exerciseName 
 * @returns {{ primary: string[], secondary: string[] }} flat arrays of SVG path IDs
 */
export function getMusclesForExercise(exerciseName) {
    const name = exerciseName.toLowerCase().trim();
    
    // Try exact match first
    let match = EXERCISE_MUSCLE_MAP[name];
    
    // Try partial match
    if (!match) {
        const key = Object.keys(EXERCISE_MUSCLE_MAP).find(k => name.includes(k) || k.includes(name));
        match = key ? EXERCISE_MUSCLE_MAP[key] : null;
    }

    if (!match) return { primary: [], secondary: [] };

    const primary = match.primary.flatMap(m => getSvgIdsForMuscle(m));
    const secondary = match.secondary.flatMap(m => getSvgIdsForMuscle(m));
    
    return { primary: [...new Set(primary)], secondary: [...new Set(secondary)] };
}

// --- Predefined Workout Plans for the Landing Page Showcase ---
export const WORKOUT_PLANS = {
    'Push Day': {
        muscles: { 
            chest: 0.9, triceps: 0.8, delts_front: 0.7, 
        },
        view: 'front'
    },
    'Pull Day': {
        muscles: { 
            lat_front: 0.9, lat_rear: 0.9, mid_back: 0.8, 
            biceps: 0.7, traps: 0.6, forearms_front: 0.4, forearms_rear: 0.4 
        },
        view: 'rear'
    },
    'Leg Day': {
        muscles: { 
            quads: 0.9, hamstrings: 0.8, glutes: 0.85, 
            adductors: 0.6, calves_front: 0.5, calves_rear: 0.5 
        },
        view: 'front'
    },
    'Full Body': {
        muscles: { 
            chest: 0.6, lat_front: 0.6, lat_rear: 0.6, quads: 0.7,
            hamstrings: 0.6, glutes: 0.6, delts_front: 0.5, delts_rear: 0.5,
            biceps: 0.5, triceps: 0.5
        },
        view: 'front'
    },
    'Upper Body': {
        muscles: {
            chest: 0.8, delts_front: 0.7, delts_rear: 0.6,
            biceps: 0.7, triceps: 0.7, lat_front: 0.6, lat_rear: 0.6,
            traps: 0.5, mid_back: 0.5
        },
        view: 'front'
    }
};
