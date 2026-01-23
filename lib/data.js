// lib/data.js

export const EXERCISES = [
    { id: 'bp', name: 'Bench Press', muscle: 'Chest', type: 'compound' },
    { id: 'sq', name: 'Squat', muscle: 'Legs', type: 'compound' },
    { id: 'dl', name: 'Deadlift', muscle: 'Back', type: 'compound' },
    { id: 'ohp', name: 'Overhead Press', muscle: 'Shoulders', type: 'compound' },
    { id: 'pu', name: 'Pull Up', muscle: 'Back', type: 'bodyweight' },
    { id: 'db_row', name: 'Dumbbell Row', muscle: 'Back', type: 'isolation' },
    { id: 'lat_raise', name: 'Lateral Raise', muscle: 'Shoulders', type: 'isolation' },
    { id: 'tri_ext', name: 'Tricep Extension', muscle: 'Arms', type: 'isolation' },
    { id: 'bi_curl', name: 'Bicep Curl', muscle: 'Arms', type: 'isolation' },
];

// User and Friend data will now come from Supabase Auth & Database
export const CURRENT_USER = null;
export const FRIENDS = [];

export const WORKOUT_TEMPLATES = [
    {
        id: 't1',
        name: 'Push Power',
        exercises: [
            { id: 'bp', sets: 4, targetReps: '5-8' },
            { id: 'ohp', sets: 3, targetReps: '8-10' },
            { id: 'lat_raise', sets: 4, targetReps: '12-15' },
            { id: 'tri_ext', sets: 3, targetReps: '10-12' }
        ]
    },
    {
        id: 't2',
        name: 'Pull Hypertrophy',
        exercises: [
            { id: 'dl', sets: 3, targetReps: '5' },
            { id: 'pu', sets: 4, targetReps: 'AMRAP' },
            { id: 'db_row', sets: 3, targetReps: '10-12' },
            { id: 'bi_curl', sets: 4, targetReps: '12-15' }
        ]
    }
];
