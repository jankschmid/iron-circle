// lib/data.js

export const EXERCISES = [
    { id: 'bench_press', name: 'Bench Press', muscle: 'Chest', type: 'compound' },
    { id: 'incline_bench_press', name: 'Incline Bench Press', muscle: 'Chest', type: 'compound' },
    { id: 'decline_bench_press', name: 'Decline Bench Press', muscle: 'Chest', type: 'compound' },
    { id: 'dumbbell_bench_press', name: 'Dumbbell Bench Press', muscle: 'Chest', type: 'compound' },
    { id: 'chest_fly', name: 'Chest Fly', muscle: 'Chest', type: 'isolation' },
    { id: 'cable_fly', name: 'Cable Fly', muscle: 'Chest', type: 'isolation' },
    { id: 'push_ups', name: 'Push Ups', muscle: 'Chest', type: 'compound' },
    { id: 'dips', name: 'Dips', muscle: 'Chest', type: 'compound' },
    { id: 'deadlift', name: 'Deadlift', muscle: 'Back', type: 'compound' },
    { id: 'pull_ups', name: 'Pull Ups', muscle: 'Back', type: 'compound' },
    { id: 'chin_ups', name: 'Chin Ups', muscle: 'Back', type: 'compound' },
    { id: 'lat_pulldown', name: 'Lat Pulldown', muscle: 'Back', type: 'compound' },
    { id: 'barbell_row', name: 'Barbell Row', muscle: 'Back', type: 'compound' },
    { id: 'dumbbell_row', name: 'Dumbbell Row', muscle: 'Back', type: 'compound' },
    { id: 'seated_cable_row', name: 'Seated Cable Row', muscle: 'Back', type: 'compound' },
    { id: 't_bar_row', name: 'T-Bar Row', muscle: 'Back', type: 'compound' },
    { id: 'face_pulls', name: 'Face Pulls', muscle: 'Back', type: 'isolation' },
    { id: 'shoulder_press', name: 'Shoulder Press', muscle: 'Shoulders', type: 'compound' },
    { id: 'overhead_press', name: 'Overhead Press', muscle: 'Shoulders', type: 'compound' },
    { id: 'arnold_press', name: 'Arnold Press', muscle: 'Shoulders', type: 'compound' },
    { id: 'lateral_raises', name: 'Lateral Raises', muscle: 'Shoulders', type: 'isolation' },
    { id: 'front_raises', name: 'Front Raises', muscle: 'Shoulders', type: 'isolation' },
    { id: 'rear_delt_fly', name: 'Rear Delt Fly', muscle: 'Shoulders', type: 'isolation' },
    { id: 'upright_row', name: 'Upright Row', muscle: 'Shoulders', type: 'compound' },
    { id: 'bicep_curls', name: 'Bicep Curls', muscle: 'Biceps', type: 'isolation' },
    { id: 'barbell_curl', name: 'Barbell Curl', muscle: 'Biceps', type: 'isolation' },
    { id: 'dumbbell_curl', name: 'Dumbbell Curl', muscle: 'Biceps', type: 'isolation' },
    { id: 'hammer_curl', name: 'Hammer Curl', muscle: 'Biceps', type: 'isolation' },
    { id: 'preacher_curl', name: 'Preacher Curl', muscle: 'Biceps', type: 'isolation' },
    { id: 'concentration_curl', name: 'Concentration Curl', muscle: 'Biceps', type: 'isolation' },
    { id: 'triceps_pushdown', name: 'Triceps Pushdown', muscle: 'Triceps', type: 'isolation' },
    { id: 'skull_crushers', name: 'Skull Crushers', muscle: 'Triceps', type: 'isolation' },
    { id: 'overhead_triceps_extension', name: 'Overhead Triceps Extension', muscle: 'Triceps', type: 'isolation' },
    { id: 'close_grip_bench_press', name: 'Close Grip Bench Press', muscle: 'Triceps', type: 'compound' },
    { id: 'squat', name: 'Squat', muscle: 'Legs', type: 'compound' },
    { id: 'front_squat', name: 'Front Squat', muscle: 'Legs', type: 'compound' },
    { id: 'hack_squat', name: 'Hack Squat', muscle: 'Legs', type: 'compound' },
    { id: 'leg_press', name: 'Leg Press', muscle: 'Legs', type: 'compound' },
    { id: 'lunges', name: 'Lunges', muscle: 'Legs', type: 'compound' },
    { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', muscle: 'Legs', type: 'compound' },
    { id: 'step_ups', name: 'Step Ups', muscle: 'Legs', type: 'compound' },
    { id: 'leg_extension', name: 'Leg Extension', muscle: 'Legs', type: 'isolation' },
    { id: 'leg_curl', name: 'Leg Curl', muscle: 'Legs', type: 'isolation' },
    { id: 'romanian_deadlift', name: 'Romanian Deadlift', muscle: 'Legs', type: 'compound' },
    { id: 'hip_thrust', name: 'Hip Thrust', muscle: 'Legs', type: 'compound' },
    { id: 'calf_raises', name: 'Calf Raises', muscle: 'Calves', type: 'isolation' },
    { id: 'plank', name: 'Plank', muscle: 'Core', type: 'isolation' },
    { id: 'hanging_leg_raises', name: 'Hanging Leg Raises', muscle: 'Core', type: 'isolation' },
    { id: 'dragon_flags', name: 'Dragon Flags', muscle: 'Core', type: 'isolation' },
    { id: 'ab_wheel_rollout', name: 'Ab Wheel Rollout', muscle: 'Core', type: 'isolation' },
    { id: 'crunches', name: 'Crunches', muscle: 'Core', type: 'isolation' },
    { id: 'cable_crunch', name: 'Cable Crunch', muscle: 'Core', type: 'isolation' },
    { id: 'russian_twists', name: 'Russian Twists', muscle: 'Core', type: 'isolation' },
    { id: 'muscle_up', name: 'Muscle Up', muscle: 'Back', type: 'compound' },
    { id: 'handstand_push_ups', name: 'Handstand Push Ups', muscle: 'Shoulders', type: 'compound' },
    { id: 'pistol_squat', name: 'Pistol Squat', muscle: 'Legs', type: 'compound' },
    { id: 'human_flag', name: 'Human Flag', muscle: 'Core', type: 'isolation' },
    { id: 'front_lever', name: 'Front Lever', muscle: 'Back', type: 'isolation' },
    { id: 'back_lever', name: 'Back Lever', muscle: 'Back', type: 'isolation' },
    { id: 'celso_shrugs', name: 'Celso Shrugs', muscle: 'Traps', type: 'isolation' },
    { id: 'barbell_shrugs', name: 'Barbell Shrugs', muscle: 'Traps', type: 'isolation' },
    { id: 'farmers_walk', name: 'Farmer\'s Walk', muscle: 'Traps', type: 'compound' },
    { id: 'neck_curl', name: 'Neck Curl', muscle: 'Neck', type: 'isolation' },
    { id: 'reverse_hyperextensions', name: 'Reverse Hyperextensions', muscle: 'Back', type: 'isolation' },
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
            { id: 'pu', sets: 4, targetReps: '10' }, // Changed from AMRAP to 10
            { id: 'db_row', sets: 3, targetReps: '10-12' },
            { id: 'bi_curl', sets: 4, targetReps: '12-15' }
        ]
    }
];
