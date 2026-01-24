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
    const [gyms, setGyms] = useState([]); // Database gyms
    const [workoutSession, setWorkoutSession] = useState(null); // Active Tracker Session

    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    // AUTH GUARD & LISTENER
    useEffect(() => {
        const fetchProfile = async (session) => {
            if (!session?.user) return null;

            try {
                // Fetch profile
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (error) console.error("Supabase profile fetch error:", error);

                // Fetch User Gyms with parsed coordinates
                const { data: userGymsData, error: gymError } = await supabase
                    .from('user_gyms')
                    .select(`
                        gym_id, 
                        label, 
                        is_default, 
                        gyms(
                            id, 
                            name, 
                            address, 
                            source
                        )
                    `)
                    .eq('user_id', session.user.id);

                if (gymError) console.error("User Gyms fetch error:", gymError);

                // Fetch coordinates separately using RPC or direct query
                const gymIds = userGymsData?.map(ug => ug.gym_id) || [];
                let gymCoords = {};

                if (gymIds.length > 0) {
                    try {
                        // Use raw query to get coordinates as text
                        const { data: coordsData, error: coordsError } = await supabase
                            .rpc('get_gym_coordinates', { gym_ids: gymIds });

                        if (!coordsError && coordsData) {
                            coordsData.forEach(c => {
                                gymCoords[c.id] = { lat: c.latitude, lng: c.longitude };
                            });
                        } else if (coordsError) {
                            console.warn('Could not fetch gym coordinates:', coordsError);
                        }
                    } catch (err) {
                        console.warn('RPC get_gym_coordinates failed:', err);
                    }
                }

                const gyms = userGymsData?.map(ug => ({
                    id: ug.gym_id,
                    name: ug.gyms?.name,
                    label: ug.label,
                    location: gymCoords[ug.gym_id] ? `POINT(${gymCoords[ug.gym_id].lng} ${gymCoords[ug.gym_id].lat})` : null,
                    address: ug.gyms?.address,
                    source: ug.gyms?.source,
                    isDefault: ug.is_default
                })) || [];

                // Determine effective Gym ID (Default > First > Profile Legacy > Null)
                const defaultGym = gyms.find(g => g.isDefault) || gyms[0];
                const effectiveGymId = defaultGym?.id || profile?.gym_id || null;

                if (profile) {
                    return {
                        id: session.user.id,
                        email: session.user.email,
                        name: profile.name || session.user.email.split('@')[0],
                        handle: '@' + profile.username,
                        avatar: profile.avatar_url || session.user.user_metadata?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
                        bio: profile.bio || '',
                        units: 'kg',
                        gymId: effectiveGymId,
                        gyms: gyms,
                        auto_tracking_enabled: profile.auto_tracking_enabled || false,
                        // Note: prs removed or kept empty as placeholder
                        prs: {}
                    };
                } else {
                    if (!pathname.startsWith('/profile/setup')) {
                        router.push('/profile/setup');
                    }
                    return {
                        id: session.user.id,
                        email: session.user.email,
                        name: 'New User',
                        handle: null,
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
                        units: 'kg',
                        gymId: effectiveGymId,
                        gyms: gyms,
                        auto_tracking_enabled: false,
                        prs: {}
                    };
                }
            } catch (err) {
                console.error("Unexpected error in fetchProfile:", err);
                return {
                    id: session.user.id,
                    email: session.user.email,
                    name: 'User',
                    handle: null,
                    avatar: '',
                    units: 'kg',
                    gymId: null,
                    gyms: [],
                    auto_tracking_enabled: false,
                    prs: {}
                };
            }
        };

        const checkUser = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    const appUser = await fetchProfile(session);
                    setUser(appUser);
                } else {
                    setUser(null);
                    if (!pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
                        router.push('/login');
                    }
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                // Ensure we don't hang in loading state
                setUser(null);
                router.push('/login');
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

    // SESSION JANITOR: Cleanup stale sessions on load
    // SESSION JANITOR & STATE SYNC
    useEffect(() => {
        if (!user?.id) return;

        const syncAndClean = async () => {
            // 1. Sync Active Tracker Session
            const { data: activeSession } = await supabase
                .from('workout_sessions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .maybeSingle();

            if (activeSession) {
                setWorkoutSession(activeSession);
            }

            // 2. Run Janitor (Cleanup stale sessions)
            // TEST MODE: Find active sessions older than 1 minute
            const threshold = new Date(Date.now() - 1 * 60 * 1000).toISOString();

            const { data: staleSessions } = await supabase
                .from('workout_sessions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .lt('start_time', threshold);

            if (!staleSessions || staleSessions.length === 0) return;

            // Close them
            for (const session of staleSessions) {
                const startTime = new Date(session.start_time);
                const endTime = new Date(startTime.getTime() + 1 * 60 * 1000).toISOString();

                await supabase
                    .from('workout_sessions')
                    .update({
                        status: 'timeout',
                        end_time: endTime,
                        duration: 60, // 1 minute in seconds
                        auto_closed: true
                    })
                    .eq('id', session.id);
            }

            // Notify User (if we just closed what was active)
            if (staleSessions.some(s => s.id === activeSession?.id)) {
                setWorkoutSession(null); // Clear local if we just timed it out
                if (Notification.permission === 'granted') {
                    new Notification("Welcome back!", {
                        body: "Your last session was automatically closed after 4 hours.",
                        icon: '/icons/info.png'
                    });
                } else {
                    // Fallback to alert if no notification permission (simple toast simulation)
                    alert("Welcome back! Your last session was automatically closed after 4 hours.");
                }
            }
        };

        syncAndClean();
    }, [user?.id]);

    // Fetch Friends when User ID is available
    useEffect(() => {
        if (!user?.id) {
            setFriends([]);
            return;
        }

        // Auto-join Gym Community if applicable
        if (user.gymId) {
            // Fetch name from DB to ensure correct community naming
            supabase.from('gyms').select('name').eq('id', user.gymId).single()
                .then(({ data }) => {
                    joinGymCommunity(user.gymId, data?.name);
                });
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

            // 4. Get Live Activity
            let liveData = {};
            try {
                // A. Tracker Sessions (Gym Check-ins)
                const { data: activeSessions } = await supabase
                    .from('workout_sessions')
                    .select('user_id, start_time, gyms(name)')
                    .in('user_id', friendIds)
                    .eq('status', 'active');

                // B. Active Workouts (Logs)
                const { data: activeLogs } = await supabase
                    .from('workouts')
                    .select('user_id, name, start_time')
                    .in('user_id', friendIds)
                    .is('end_time', null);

                // Merge into map
                if (activeSessions) {
                    activeSessions.forEach(s => {
                        liveData[s.user_id] = {
                            type: 'tracker',
                            action: 'Gym Session',
                            detail: 'Checked In',
                            location: s.gyms?.name || 'Unknown Gym',
                            startTime: s.start_time
                        };
                    });
                }

                // Logs override tracker (more specific) or just exist
                if (activeLogs) {
                    activeLogs.forEach(l => {
                        // If they have a tracker session too, maybe use the location from it?
                        const existing = liveData[l.user_id];
                        liveData[l.user_id] = {
                            type: 'log',
                            action: 'Workout Plan',
                            detail: l.name || 'Custom Workout',
                            location: existing?.location || 'Unknown Location', // Try to keep location if matched
                            startTime: l.start_time
                        };
                    });
                }
            } catch (err) {
                console.error("Live activity fetch error:", err);
            }

            // 5. Set State
            const formattedFriends = profiles.map(p => {
                const live = liveData[p.id];
                return {
                    id: p.id,
                    name: p.name,
                    handle: '@' + p.username,
                    avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
                    status: live ? 'active' : 'offline',
                    activity: live,
                    lastActive: '2h ago',
                    weeklyStats: statsMap[p.id] || { volume: 0, workouts: 0, time: 0, streak: 0 }
                };
            });

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

    const createGroupChat = async (name, memberIds) => {
        try {
            // 1. Create Conversation
            const { data: newConvo, error: createError } = await supabase
                .from('conversations')
                .insert({
                    type: 'group',
                    name: name
                })
                .select()
                .single();

            if (createError) throw createError;

            // 2. Add Participants (Creator + Members)
            const participants = [user.id, ...memberIds].map(uid => ({
                conversation_id: newConvo.id,
                user_id: uid,
                last_read_at: new Date().toISOString()
            }));

            const { error: partError } = await supabase
                .from('conversation_participants')
                .insert(participants);

            if (partError) throw partError;

            // 3. Add System Message
            const { error: msgError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: newConvo.id,
                    sender_id: user.id, // Or maybe null if system message support exists, but sticking to user for now or handling in UI
                    content: `Created group "${name}"`
                });

            // Optimistic Update (Optional, waiting for real time might be safer but let's push it)
            // Actually, simply return the ID and let the UI redirect/fetch
            return newConvo.id;

        } catch (err) {
            console.error("Failed to create group:", err);
            throw err;
        }
    };

    const addMemberToGroup = async (chatId, userId) => {
        try {
            const { error } = await supabase
                .from('conversation_participants')
                .insert({
                    conversation_id: chatId,
                    user_id: userId
                });

            if (error) throw error;

            // System msg
            await supabase.from('messages').insert({
                conversation_id: chatId,
                sender_id: user.id,
                content: 'Added a new member'
            });

        } catch (err) {
            console.error("Failed to add member:", err);
            throw err;
        }
    };

    const renameGroup = async (chatId, newName) => {
        try {
            const { error } = await supabase
                .from('conversations')
                .update({ name: newName })
                .eq('id', chatId);

            if (error) throw error;

            // System msg
            await supabase.from('messages').insert({
                conversation_id: chatId,
                sender_id: user.id,
                content: `Renamed group to "${newName}"`
            });

        } catch (err) {
            console.error("Failed to rename group:", err);
            throw err;
        }
    };

    const leaveGroup = async (chatId) => {
        try {
            const { error } = await supabase
                .from('conversation_participants')
                .delete()
                .eq('conversation_id', chatId)
                .eq('user_id', user.id); // Secure: only delete self

            if (error) throw error;

            setChats(prev => prev.filter(c => c.id !== chatId));

        } catch (err) {
            console.error("Failed to leave group:", err);
            throw err;
        }
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
        // Trigger side effects BEFORE state update if we need old state,
        // or just check against current 'user' closure variable.
        if (updates.gymId && updates.gymId !== user?.gymId) {
            joinGymCommunity(updates.gymId, updates.gymName);
        }

        setUser(prev => {
            const newState = { ...prev, ...updates };
            return newState;
        });
    };

    const saveUserGym = async (name, lat, lng, label = 'My Gym', address = null, source = 'manual') => {
        if (!user) return;
        try {
            // 1. Create Gym Entry
            const { data: gym, error: gError } = await supabase
                .from('gyms')
                .insert({
                    name,
                    location: `POINT(${lng} ${lat})`,
                    address,
                    source,
                    created_by: user.id
                })
                .select()
                .single();

            if (gError) throw gError;

            // 2. Create Community for this Gym
            const { data: community, error: cError } = await supabase
                .from('communities')
                .insert({
                    gym_id: gym.id,
                    name: name,
                    description: `Community for ${name}`,
                    created_by: user.id
                })
                .select()
                .single();

            if (cError) console.error("Error creating community:", cError);

            // 3. Create Conversation
            const { data: conversation, error: chatError } = await supabase
                .from('conversations')
                .insert({
                    type: 'community',
                    name: name,
                    gym_id: gym.id
                })
                .select()
                .single();

            if (chatError) console.error("Error creating chat:", chatError);

            // 4. Link to User (Gym)
            const { error: ugError } = await supabase
                .from('user_gyms')
                .insert({
                    user_id: user.id,
                    gym_id: gym.id,
                    label,
                    is_default: (user.gyms?.length === 0)
                });

            if (ugError) throw ugError;

            // 5. Join Community & Chat
            if (community) {
                await supabase.from('community_members').insert({
                    community_id: community.id,
                    user_id: user.id,
                    role: 'admin'
                });
            }

            if (conversation) {
                await supabase.from('conversation_participants').insert({
                    conversation_id: conversation.id,
                    user_id: user.id
                });
            }

            // 6. Refresh
            const { data: userGymsData } = await supabase
                .from('user_gyms')
                .select('gym_id, label, is_default, gyms(id, name, location, address, source)')
                .eq('user_id', user.id);

            const gyms = userGymsData?.map(ug => ({
                id: ug.gym_id,
                name: ug.gyms?.name,
                label: ug.label,
                location: ug.gyms?.location,
                address: ug.gyms?.address,
                source: ug.gyms?.source,
                isDefault: ug.is_default
            })) || [];

            setUser(prev => ({ ...prev, gyms, gymId: gyms.find(g => g.isDefault)?.id || gyms[0]?.id }));

        } catch (err) {
            console.error("Save Gym Error:", err);
            throw err;
        }
    };

    const removeUserGym = async (gymId) => {
        try {
            const { error } = await supabase
                .from('user_gyms')
                .delete()
                .eq('user_id', user.id)
                .eq('gym_id', gymId);

            if (error) throw error;

            setUser(prev => {
                const newGyms = prev.gyms.filter(g => g.id !== gymId);
                // If we deleted default, make first one default?
                // Logic needed but for now just filter.
                return { ...prev, gyms: newGyms };
            });
        } catch (err) {
            console.error("Remove Gym Error:", err);
        }
    };

    const setDefaultGym = async (gymId) => {
        try {
            // Batch update via RPC or sequential
            await supabase.from('user_gyms').update({ is_default: false }).eq('user_id', user.id);
            await supabase.from('user_gyms').update({ is_default: true }).eq('user_id', user.id).eq('gym_id', gymId);

            setUser(prev => ({
                ...prev,
                gymId: gymId,
                gyms: prev.gyms.map(g => ({ ...g, isDefault: g.id === gymId }))
            }));
        } catch (err) {
            console.error("Set Default Error:", err);
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
            return conversationId;
        } catch (err) {
            console.error("Failed to join gym community:", err);
            return null;
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

    // Fetch Gyms (GPS or All)
    const fetchGyms = async (lat = null, lng = null) => {
        try {
            let data, error;
            if (lat && lng) {
                // Use PostGIS Search
                const { data: nearby, error: rpcError } = await supabase
                    .rpc('get_gyms_nearby', {
                        lat,
                        lng,
                        radius_meters: 50000 // 50km default search
                    });
                data = nearby;
                error = rpcError;
            } else {
                // Fetch basic list (limit 50)
                const { data: all, error: allError } = await supabase
                    .from('gyms')
                    .select('id, name, address, location')
                    .limit(50);
                data = all;
                error = allError;
            }

            if (error) throw error;
            setGyms(data || []);
            return data;
        } catch (err) {
            console.error("Error fetching gyms:", err);
            return [];
        }
    };

    // ========== COMMUNITY FUNCTIONS ==========
    const fetchCommunities = async (searchQuery = '') => {
        try {
            let query = supabase
                .from('communities')
                .select('*, gyms(id, name, address, location)');

            if (searchQuery) {
                query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query.order('member_count', { ascending: false }).limit(50);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error("Error fetching communities:", err);
            return [];
        }
    };

    const joinCommunity = async (communityId, gymId, gymName) => {
        try {
            // 1. Join the community
            const { error: joinError } = await supabase
                .from('community_members')
                .insert({ community_id: communityId, user_id: user.id });

            if (joinError && joinError.code !== '23505') throw joinError;

            // 2. Auto-join the gym
            const { error: gymError } = await supabase
                .from('user_gyms')
                .insert({
                    user_id: user.id,
                    gym_id: gymId,
                    label: gymName,
                    is_default: false
                });

            if (gymError && gymError.code !== '23505') { // Ignore duplicate key error
                throw gymError;
            }

            // 3. Join the Gym Chat automatically
            const conversationId = await joinGymCommunity(gymId, gymName);

            // 4. Refresh user's gym list
            const { data: userGymsData } = await supabase
                .from('user_gyms')
                .select('gym_id, label, is_default, gyms(id, name, address, source)')
                .eq('user_id', user.id);

            const gyms = userGymsData?.map(ug => ({
                id: ug.gym_id,
                name: ug.gyms?.name,
                label: ug.label,
                address: ug.gyms?.address,
                source: ug.gyms?.source,
                isDefault: ug.is_default
            })) || [];

            updateUserProfile({ gyms });

            return { success: true, conversationId };
        } catch (err) {
            console.error("Error joining community:", err);
            throw err;
        }
    };

    const leaveCommunity = async (communityId) => {
        try {
            const { error } = await supabase
                .from('community_members')
                .delete()
                .eq('community_id', communityId)
                .eq('user_id', user.id);

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error("Error leaving community:", err);
            throw err;
        }
    };

    const getCommunityMembers = async (communityId) => {
        try {
            const { data, error } = await supabase
                .from('community_members')
                .select('user_id, joined_at, role, profiles(id, name, handle, avatar_url)')
                .eq('community_id', communityId)
                .order('joined_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error("Error fetching community members:", err);
            return [];
        }
    };

    return (
        <StoreContext.Provider value={{
            user,
            updateUserProfile,
            friends,
            activeWorkout,
            startWorkout,
            finishWorkout,
            logSet,
            history,
            workoutTemplates,
            addWorkoutTemplate,
            updateWorkoutTemplate,
            deleteWorkoutTemplate,
            exercises,
            addCustomExercise,
            chats,
            getChat,
            fetchFriendWorkouts,
            joinGymCommunity,
            saveUserGym,
            removeUserGym,
            setDefaultGym,
            getWeeklyStats,
            getPersonalBests,
            getExerciseHistory,
            toggleUnits,
            convertWeight,
            sendMessage,
            createGroupChat,
            addMemberToGroup,
            renameGroup,
            leaveGroup,
            gyms,
            fetchGyms,
            workoutSession,
            setWorkoutSession,
            fetchCommunities,
            joinCommunity,
            leaveCommunity,
            getCommunityMembers
        }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    return useContext(StoreContext);
}
