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

export const CURRENT_USER = {
    id: 'u1',
    name: 'Alex "The Iron" Wolf',
    handle: '@alexwolf',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    bio: 'Chasing the 500 club. Hybrid athlete.',
    homeGym: 'Iron Paradise, Venice',
    isPremium: true,
    stats: {
        workoutsCompleted: 142,
        volumeLiftedWeek: 45000,
    },
    prs: {
        'bp': { weight: 120, reps: 1, date: '2025-12-10' },
        'sq': { weight: 160, reps: 3, date: '2026-01-05' },
        'dl': { weight: 200, reps: 1, date: '2025-11-20' },
    }
};

export const FRIENDS = [
    {
        id: 'u2',
        name: 'Sarah Conner',
        handle: '@sarahc',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        status: 'active',
        lastActive: 'Now',
        activity: {
            action: 'Training',
            detail: 'Leg Day (High Volume)',
            startedAt: '2026-01-23T08:30:00.000Z', // Static time
            location: 'Gold\'s Gym'
        }
    },
    {
        id: 'u3',
        name: 'Mike Mentzer',
        handle: '@heavyduty',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
        status: 'inactive',
        lastActive: '4h ago',
        activity: null
    },
    {
        id: 'u4',
        name: 'David Goggins',
        handle: '@stayhard',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
        status: 'active',
        lastActive: 'Now',
        activity: {
            action: 'Running',
            detail: 'Ultra Marathon Prep',
            startedAt: '2026-01-23T06:00:00.000Z', // Static time
            location: 'Outdoor'
        }
    }
];

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
