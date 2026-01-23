// lib/store.js
"use client";

import { createClient } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { createContext, useContext, useState, useEffect } from 'react';
import { WORKOUT_TEMPLATES, EXERCISES } from './data';

const StoreContext = createContext();

export function StoreProvider({ children }) {
    const [user, setUser] = useState(null); // No default user
    const [friends, setFriends] = useState([]);
    const [activeWorkout, setActiveWorkout] = useState(null);
    const [history, setHistory] = useState([]);
    const [workoutTemplates, setWorkoutTemplates] = useState(WORKOUT_TEMPLATES);
    const [exercises, setExercises] = useState(EXERCISES);
    const [chats, setChats] = useState([]);

    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    // AUTH GUARD & LISTENER
    useEffect(() => {
        const fetchProfile = async (session) => {
            if (!session?.user) return null;

            // Fetch profile data from 'profiles' table
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                return {
                    id: session.user.id,
                    email: session.user.email,
                    name: profile.name || session.user.email.split('@')[0],
                    handle: '@' + profile.username,
                    avatar: profile.avatar_url || session.user.user_metadata?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
                    bio: profile.bio || '',
                    units: 'kg',
                    gymId: profile.gym_id || null,
                    prs: {}
                };
            } else {
                // User logged in but no profile -> Redirect to setup
                // Exception: Don't redirect if already on setup page
                if (!pathname.startsWith('/profile/setup')) {
                    router.push('/profile/setup');
                }
                // Return temp user so we don't flash 'Login' screen
                return {
                    id: session.user.id,
                    email: session.user.email,
                    name: 'New User',
                    handle: null, // Signals missing profile
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
                    units: 'kg',
                    gymId: null,
                    prs: {}
                };
            }
        };

        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const appUser = await fetchProfile(session);
                setUser(appUser);
            } else {
                setUser(null);
                if (!pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
                    router.push('/login');
                }
            }
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const appUser = await fetchProfile(session);
                setUser(appUser);
                // Redirect handled inside fetchProfile or component checks
                if (appUser?.handle) {
                    router.push('/');
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                router.push('/login');
            }
        });

        return () => subscription.unsubscribe();
    }, [pathname]);

    // Fetch Friends when User ID is available
    useEffect(() => {
        if (!user?.id) {
            setFriends([]);
            return;
        }

        // Auto-join Gym Community if applicable
        if (user.gymId) {
            joinGymCommunity(user.gymId, GYMS.find(g => g.id === user.gymId)?.name);
        }

        const fetchFriends = async () => {
            // 1. Get Friendships
            let friendIds = [];
            try {
                const { data: friendships, error: fsError } = await supabase
                    .from('friendships')
                    .select('user_id, friend_id')
                    .eq('status', 'accepted')
                    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

                if (fsError) {
                    console.error("Friendship fetch error:", fsError);
                    return;
                }

                if (!friendships || friendships.length === 0) {
                    setFriends([]);
                    return;
                }

                friendIds = friendships.map(f =>
                    f.user_id === user.id ? f.friend_id : f.user_id
                );
            } catch (error) {
                console.error("Error getting friendships:", error);
                return;
            }

            // 2. Get Profiles (Essential)
            let profiles = [];
            try {
                const { data, error: pError } = await supabase
                    .from('profiles')
                    .select('id, name, username, avatar_url, bio')
                    .in('id', friendIds);

                if (pError) throw pError;
                profiles = data || [];
            } catch (error) {
                console.error("Error getting profiles:", error);
                // If we can't get profiles, we can't show friends
                return;
            }

            // 3. Get Workouts (Optional - Stats)
            const statsMap = {};
            try {
                const { data: friendWorkouts, error: wError } = await supabase
                    .from('workouts')
                    .select('user_id, volume, duration, end_time')
                    .in('user_id', friendIds)
                    .gte('end_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

                if (wError) throw wError;

                if (friendWorkouts) {
                    const now = new Date();
                    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                    friendWorkouts.forEach(w => {
                        if (!statsMap[w.user_id]) statsMap[w.user_id] = { volume: 0, workouts: 0, time: 0, streak: 0, dates: [] };

                        const wDate = new Date(w.end_time);
                        statsMap[w.user_id].dates.push(w.end_time.split('T')[0]);

                        if (wDate >= sevenDaysAgo) {
                            statsMap[w.user_id].volume += (w.volume || 0);
                            statsMap[w.user_id].workouts += 1;
                            statsMap[w.user_id].time += (w.duration || 0);
                        }
                    });

                    // Calculate Streaks
                    Object.values(statsMap).forEach(stat => {
                        const uniqueDays = [...new Set(stat.dates)].sort().reverse();
                        let streak = 0;
                        const today = new Date().toISOString().split('T')[0];
                        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                        let currentDay = uniqueDays[0];

                        if (currentDay && (currentDay === today || currentDay === yesterday)) {
                            streak = 1;
                            let checkDate = new Date(currentDay);
                            for (let i = 1; i < uniqueDays.length; i++) {
                                checkDate.setDate(checkDate.getDate() - 1);
                                if (uniqueDays[i] === checkDate.toISOString().split('T')[0]) {
                                    streak++;
                                } else {
                                    break;
                                }
                            }
                        }
                        stat.streak = streak;
                    });
                }
            } catch (error) {
                console.error("Error fetching friend stats (non-fatal):", error);
                // Continue without stats
            }

            // 4. Set State
            const formattedFriends = profiles.map(p => ({
                id: p.id,
                name: p.name,
                handle: '@' + p.username,
                avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
                status: 'offline',
                lastActive: '2h ago',
                weeklyStats: statsMap[p.id] || { volume: 0, workouts: 0, time: 0, streak: 0 }
            }));

            setFriends(formattedFriends);
        };

        fetchFriends();
    }, [user?.id]);

    // Fetch User's Workout History on Load
    useEffect(() => {
        if (!user?.id) return;

        const fetchHistory = async () => {
            const { data } = await supabase
                .from('workouts')
                .select(`
                    id, name, start_time, end_time, volume, duration,
                    logs:workout_logs(exercise_id, sets)
                `)
                .eq('user_id', user.id)
                .order('end_time', { ascending: false });

            if (data) {
                // Transform to app format
                const formatted = data.map(w => ({
                    id: w.id,
                    name: w.name,
                    startTime: w.start_time,
                    endTime: w.end_time,
                    volume: w.volume,
                    logs: w.logs.map(l => ({
                        exerciseId: l.exercise_id,
                        sets: l.sets
                    }))
                }));
                setHistory(formatted);
            }
        };

        fetchHistory();
    }, [user?.id]);

    // Fetch Friend's Workouts (Public/Friend View)
    const fetchFriendWorkouts = async (friendId) => {
        const { data } = await supabase
            .from('workouts')
            .select(`
                id, name, start_time, end_time, volume, duration,
                logs:workout_logs(exercise_id, sets)
            `)
            .eq('user_id', friendId)
            .order('end_time', { ascending: false })
            .limit(10);

        if (!data) return [];

        return data.map(w => ({
            id: w.id,
            name: w.name,
            startTime: w.start_time,
            endTime: w.end_time,
            volume: w.volume,
            exercises: w.logs.map(l => {
                const ex = EXERCISES.find(e => e.id === l.exercise_id);
                return ex ? ex.name : l.exercise_id;
            })
        }));
    };

    const GYMS = [
        { id: 'iron-paradise', name: 'Iron Paradise', location: 'Venice Beach' },
        { id: 'gold-gym', name: 'Gold\'s Gym', location: 'Santa Monica' },
        { id: 'planet-fitness', name: 'Planet Fitness', location: 'Downtown' },
    ];

    const sendMessage = (chatId, text) => {
        setChats(prev => {
            const existingIndex = prev.findIndex(c => c.id === chatId);

            const newMessage = {
                id: Date.now(),
                senderId: user.id,
                senderName: user.name,
                text,
                timestamp: new Date().toISOString()
            };

            if (existingIndex >= 0) {
                // Update existing chat
                const newChats = [...prev];
                newChats[existingIndex] = {
                    ...newChats[existingIndex],
                    messages: [...newChats[existingIndex].messages, newMessage]
                };
                return newChats;
            } else {
                // Start new private chat
                const friend = friends.find(f => f.id.toString() === chatId);
                const chatName = friend ? friend.name : 'User';

                return [...prev, {
                    id: chatId,
                    name: chatName,
                    type: 'private',
                    messages: [newMessage]
                }];
            }
        });
    };

    const createGroupChat = (name, memberIds) => {
        const newChatId = 'group-' + Date.now();
        const initialMessage = {
            id: Date.now(),
            senderId: 'system',
            senderName: 'System',
            text: `Group "${name}" created`,
            timestamp: new Date().toISOString()
        };

        const newChat = {
            id: newChatId,
            name,
            type: 'group',
            members: [user.id, ...memberIds],
            messages: [initialMessage]
        };

        setChats(prev => [newChat, ...prev]);
        return newChatId;
    };

    const getChat = (chatId) => {
        // If it doesn't exist (e.g. private chat first time), create mock
        const existing = chats.find(c => c.id === chatId);
        if (existing) return existing;

        // Mock private chat creation
        const friend = friends.find(f => f.id.toString() === chatId);
        if (friend) {
            return { id: chatId, name: friend.name, type: 'private', messages: [] };
        }
        return null;
    };

    const toggleUnits = () => {
        setUser(prev => ({ ...prev, units: prev.units === 'kg' ? 'lbs' : 'kg' }));
    };

    // Action: Start Workout
    const startWorkout = (templateId) => {
        console.log(`Attempting to start workout with ID: ${templateId}`);
        // Use state 'workoutTemplates' as the single source of truth to ensure edits are applied
        const template = workoutTemplates.find(t => t.id === templateId);

        if (!template) {
            console.error(`Template not found for ID: ${templateId}`);
            console.log('Available templates:', workoutTemplates);
            return;
        }

        const newSession = {
            id: Date.now().toString(),
            templateId,
            name: template.name,
            startTime: new Date().toISOString(),
            logs: template.exercises.map(ex => {
                // Generate default sets
                const initialSets = [];

                // New Format: Explicit sets array
                if (ex.sets && Array.isArray(ex.sets)) {
                    ex.sets.forEach(s => {
                        initialSets.push({
                            weight: 0, // Always 0 as requested
                            reps: s.reps || 10,
                            completed: false
                        });
                    });
                } else {
                    // Fallback to old format (targetSets/targetReps)
                    const targetSets = ex.targetSets || 3;
                    for (let i = 0; i < targetSets; i++) {
                        initialSets.push({
                            weight: 0, // Always 0 as requested
                            reps: ex.targetReps || 10,
                            completed: false,
                        });
                    }
                }

                return {
                    exerciseId: ex.id,
                    sets: initialSets
                };
            })
        };

        setActiveWorkout(newSession);

        // Simulate notifying friends in a real app
        console.log(`User started workout: ${template.name}`);
    };

    // Action: Finish Workout
    const finishWorkout = async () => {
        if (!activeWorkout || !user) return;

        const endTime = new Date().toISOString();
        const duration = Math.round((new Date(endTime) - new Date(activeWorkout.startTime)) / 1000); // seconds

        // Calculate total Volume
        let totalVolume = 0;
        activeWorkout.logs.forEach(log => {
            log.sets.forEach(s => {
                if (s.completed) totalVolume += (s.weight || 0) * (s.reps || 0);
            });
        });

        const completedSession = {
            ...activeWorkout,
            endTime,
            volume: totalVolume,
            duration
        };

        // Optimistic UI Update
        setHistory(prev => [completedSession, ...prev]);
        setActiveWorkout(null);

        // Save to Supabase
        try {
            // 1. Create Workout
            const { data: workoutData, error: workoutError } = await supabase
                .from('workouts')
                .insert({
                    user_id: user.id,
                    name: activeWorkout.name,
                    template_id: activeWorkout.templateId,
                    start_time: activeWorkout.startTime,
                    end_time: endTime,
                    volume: totalVolume,
                    duration: duration
                })
                .select()
                .single();

            if (workoutError) throw workoutError;

            // 2. Create Logs
            const logsToInsert = activeWorkout.logs.map(log => ({
                workout_id: workoutData.id,
                exercise_id: log.exerciseId,
                sets: log.sets
            }));

            const { error: logsError } = await supabase
                .from('workout_logs')
                .insert(logsToInsert);

            if (logsError) throw logsError;

        } catch (err) {
            console.error("Failed to save workout:", err);
            // Optionally revert optimistic update or notify user
        }
    };

    // Action: Log Set
    const logSet = (exerciseId, setIndex, data) => {
        setActiveWorkout(prev => {
            if (!prev) return null;

            const newLogs = prev.logs.map(log => {
                if (log.exerciseId !== exerciseId) return log;

                // Ensure sets array has enough items
                const newSets = [...log.sets];
                newSets[setIndex] = { ...data, completed: true, timestamp: new Date().toISOString() };

                return { ...log, sets: newSets };
            });

            return { ...prev, logs: newLogs };
        });
    };



    const addWorkoutTemplate = (template) => {
        const newTemplate = { ...template, id: Date.now().toString() };
        setWorkoutTemplates(prev => [...prev, newTemplate]);
        return newTemplate;
    };

    const updateWorkoutTemplate = (id, updates) => {
        setWorkoutTemplates(prev => prev.map(t =>
            t.id === id ? { ...t, ...updates } : t
        ));
    };

    const deleteWorkoutTemplate = (id) => {
        setWorkoutTemplates(prev => prev.filter(t => t.id !== id));
    };

    const addCustomExercise = (name, muscle = 'Other') => {
        const newEx = {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            muscle
        };
        setExercises(prev => [...prev, newEx]);
        return newEx;
    };

    const updateUserProfile = (updates) => {
        const { user } = get(); // Correction: get() is not avail here, we are in component. 
        // Logic error in previous thought: I am inside a functional component!
        // I need to use state setter or access state directly.
        setUser(prev => {
            const newState = { ...prev, ...updates };
            return newState;
        });

        // Trigger side effects
        if (updates.gymId && updates.gymId !== user?.gymId) {
            joinGymCommunity(updates.gymId, updates.gymName);
        }
    };

    const joinGymCommunity = async (gymId, gymName) => {
        if (!user || !gymId) return;
        try {
            // Check if conversation exists
            const { data: existing } = await supabase
                .from('conversations')
                .select('id')
                .eq('type', 'gym')
                .eq('gym_id', gymId)
                .maybeSingle();

            let conversationId;

            if (existing) {
                conversationId = existing.id;
            } else {
                // Create new
                const { data: newConvo, error: createError } = await supabase
                    .from('conversations')
                    .insert({
                        type: 'gym',
                        name: gymName || 'Gym Community',
                        gym_id: gymId
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                conversationId = newConvo.id;
            }

            // Check if participant
            const { data: part } = await supabase
                .from('conversation_participants')
                .select('*')
                .eq('conversation_id', conversationId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (!part) {
                await supabase.from('conversation_participants').insert({
                    conversation_id: conversationId,
                    user_id: user.id
                });
            }
        } catch (err) {
            console.error("Failed to join gym community:", err);
        }
    };

    // Calculate Weekly Volume & Stats
    const getWeeklyStats = () => {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday
        startOfWeek.setHours(0, 0, 0, 0);

        const volumeByDay = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
        let weeklyVolume = 0;
        let weeklyWorkouts = 0;
        let weeklyTime = 0;

        const uniqueDays = new Set();

        history.forEach(session => {
            const date = new Date(session.endTime);
            const dateStr = date.toISOString().split('T')[0];
            uniqueDays.add(dateStr);

            // Weekly checks (simple rolling 7 days approx for now, or match friend logic strictness)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            if (date >= sevenDaysAgo) {
                // Calculate session volume
                let sessionVolume = 0;
                // If persisted volume is there, use it, else recalc
                if (session.volume !== undefined) {
                    sessionVolume = session.volume;
                } else {
                    session.logs.forEach(log => {
                        log.sets.forEach(set => {
                            if (set.completed) sessionVolume += (set.weight || 0) * (set.reps || 0);
                        });
                    });
                }
                weeklyVolume += sessionVolume;
                weeklyWorkouts++;
                weeklyTime += (session.duration || 0);
            }

            // Chart logic (Mon-Sun)
            // Fix: ensure correct index even if history is old
            // Actually, for the chart we only want current week relative to today? 
            // Or relative to startOfWeek?
            // Existing logic uses history.forEach so it sums ALL time? 
            // Wait, existing logic:
            // "if (date < oneWeekAgo) return;" (in previous thought, but look at file content)
            // File content: 
            /*
             history.forEach(session => {
                const date = new Date(session.endTime);
                // Only count if in current week (simplified)
            */
            // The file content I read has NO filter in the loop! It sums everything into volumeByDay based on day index.
            // That's a bug for "Weekly Volume" chart if it includes last year's Mondays.
            // Let's fix that too.

            if (date >= startOfWeek) {
                let sessionVolume = session.volume || 0;
                if (!session.volume) {
                    session.logs.forEach(l => l.sets.forEach(s => { if (s.completed) sessionVolume += (s.weight || 0) * (s.reps || 0) }));
                }

                let dayIndex = date.getDay() - 1;
                if (dayIndex === -1) dayIndex = 6;
                volumeByDay[dayIndex] += sessionVolume;
            }
        });

        // Calculate User Streak
        const sortedDays = [...uniqueDays].sort().reverse();
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (sortedDays.includes(today) || sortedDays.includes(yesterday)) {
            streak = 1; // At least active recently
            // Check consecutive
            let checkDate = new Date(sortedDays.includes(today) ? today : yesterday);
            for (let i = 1; i < sortedDays.length; i++) {
                checkDate.setDate(checkDate.getDate() - 1);
                if (sortedDays.includes(checkDate.toISOString().split('T')[0])) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        const totalWorkouts = history.length;
        const totalVolume = history.reduce((acc, s) => acc + (s.volume || 0), 0);

        return {
            volumeByDay,
            totalWorkouts,
            totalVolume,
            weeklyVolume,
            weeklyWorkouts,
            weeklyTime,
            streak
        };
    };

    const getPersonalBests = () => {
        const bests = {}; // { 'Exercise Name': { weight: 100, date: '...' } }

        // Iterate through all history
        history.forEach(session => {
            session.logs.forEach(log => {
                const exercise = EXERCISES.find(e => e.id === log.exerciseId);
                if (!exercise) return;

                log.sets.forEach(set => {
                    if (!set.completed) return;
                    const name = exercise.name;
                    // Simple max weight logic
                    if (!bests[name] || set.weight > bests[name].weight) {
                        bests[name] = { weight: set.weight, date: session.endTime.split('T')[0] };
                    }
                });
            });
        });

        // Convert to array
        return Object.entries(bests)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 4); // Top 4
    };

    const getExerciseHistory = (exerciseId) => {
        // Basic lookup - get last session where this exercise was performed
        // In a real app we'd filter 'history'
        // For now returning mock 'Ghost' data specific to the exercise
        const userPR = user.prs[exerciseId];
        if (userPR) return { lastWeight: userPR.weight * 0.9, lastReps: userPR.reps + 2 }; // Mock logic
        return null;
    };


    // Unit Conversion Helper
    const convertWeight = (weightInKg, targetUnit) => {
        if (!weightInKg) return 0;
        if (targetUnit === 'lbs') {
            return Math.round(weightInKg * 2.20462);
        }
        return Math.round(weightInKg);
    };

    return (
        <StoreContext.Provider value={{
            user,
            friends,
            activeWorkout,
            history, // Exposed
            exercises, // State
            workoutTemplates, // State
            chats, // State
            startWorkout,
            finishWorkout,
            logSet,
            addWorkoutTemplate,
            updateWorkoutTemplate,
            deleteWorkoutTemplate,
            addCustomExercise,
            updateUserProfile,
            fetchFriendWorkouts, // Exposed
            joinGymCommunity, // Exposed
            getWeeklyStats,
            getPersonalBests,
            toggleUnits,
            convertWeight, // Helper
            sendMessage,
            getChat,
            createGroupChat,
            GYMS,
            getExerciseHistory
        }}>
            {children}
        </StoreContext.Provider >
    );
}

export function useStore() {
    return useContext(StoreContext);
}
