// lib/store.js
"use client";

import { createClient } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { EXERCISES } from './data';
import { PreferenceUtils, KEYS } from '@/lib/preferences';

const StoreContext = createContext();

// Fix: Global singleton to prevent AbortErrors in Strict Mode
const supabaseClient = createClient();

export function StoreProvider({ children }) {
    const [user, setUser] = useState(null); // No default user
    const [friends, setFriends] = useState([]);
    const [activeWorkout, setActiveWorkout] = useState(null);
    const [history, setHistory] = useState([]);
    const [workoutTemplates, setWorkoutTemplates] = useState([]);
    const [exercises, setExercises] = useState(EXERCISES);
    const [chats, setChats] = useState([]);
    const [gyms, setGyms] = useState([]); // Database gyms
    const [workoutSession, setWorkoutSession] = useState(null); // Active Tracker Session

    const router = useRouter();
    const pathname = usePathname();

    // Use the global singleton
    const supabase = supabaseClient;

    const fetchProfile = async (session) => {
        // 1. Monitor Check (hatten wir schon)
        if (typeof window !== 'undefined' && window.location.pathname.includes('/gym/display')) {
            console.log("Monitor Mode: Skipping Profile Fetch");
            return null;
        }

        if (pathname?.startsWith('/community')) return null;

        // 2. Session Check (NEU: Verhindert Timeouts bei ausgeloggten Usern)
        // If session object passed is valid, use it. If not, check global.
        if (!session?.user?.id) {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession?.user?.id) {
                console.log("No session found, skipping profile fetch.");
                return null;
            }
            // Use the fresh session
            session = currentSession;
        }

        console.log("fetchProfile: Starting for", session.user.id);

        try {
            // PARALLEL FETCHING for performance
            console.log("fetchProfile: Starting parallel fetches...");

            const [profileRes, userGymsRes, rolesRes] = await Promise.all([
                // 1. Profile
                supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
                // 2. User Gyms
                supabase.from('user_gyms').select(`gym_id, label, is_default, radius, gyms ( id, name, address, source, created_by, is_verified )`).eq('user_id', session.user.id),
                // 3. Roles
                supabase.from('community_members').select('community_id, role, communities(gym_id, gym_type)').eq('user_id', session.user.id)
            ]);

            const { data: profile, error } = profileRes;
            const { data: userGymsData, error: gymError } = userGymsRes;
            const { data: rolesData } = rolesRes;

            console.log("fetchProfile: Parallel results received.");

            // Error Handling (Profile)
            if (error) {
                // Fix: Suppress AbortErrors in detailed error check
                if (error.message?.includes('AbortError') || error.code === '20' || error.name === 'AbortError') {
                    console.warn("fetchProfile: Request cancelled (AbortError) - Ignored");
                    throw error;
                }
                console.error("fetchProfile: Profile Error", JSON.stringify(error, null, 2));
                if (error.code === 'PGRST116') {
                    console.log("fetchProfile: New User Detected");
                    if (!pathname.startsWith('/profile/setup')) router.push('/profile/setup');
                    return {
                        id: session.user.id,
                        email: session.user.email,
                        name: 'New User',
                        handle: null,
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
                        units: 'kg',
                        gymId: null,
                        gyms: [],
                        auto_tracking_enabled: false,
                        prs: {}
                    };
                }
                throw error;
            }

            if (gymError) console.error("fetchProfile: Gym Error", JSON.stringify(gymError, null, 2));

            // Fetch Coords (Dependent on gyms)
            const gymIds = userGymsData?.map(ug => ug.gym_id) || [];
            let gymCoords = {};
            if (gymIds.length > 0) {
                try {
                    const coordsPromise = supabase.rpc('get_gym_coordinates', { gym_ids: gymIds });
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Coords timeout')), 2000));
                    const { data: coordsData } = await Promise.race([coordsPromise, timeoutPromise]);
                    if (coordsData) {
                        coordsData.forEach(c => gymCoords[c.id] = { lat: c.latitude, lng: c.longitude });
                    }
                } catch (e) { console.warn("fetchProfile: Coords timed out or failed", e); }
            }

            // Map Roles
            const roleMap = {};
            rolesData?.forEach(r => {
                if (r.communities?.gym_id) {
                    roleMap[r.communities.gym_id] = { role: r.role, type: r.communities.gym_type };
                }
            });

            // Construct Gym List
            const gyms = userGymsData?.map(ug => ({
                id: ug.gym_id,
                name: ug.gyms?.name,
                label: ug.label,
                location: gymCoords[ug.gym_id] ? `POINT(${gymCoords[ug.gym_id].lng} ${gymCoords[ug.gym_id].lat})` : null,
                address: ug.gyms?.address,
                source: ug.gyms?.source,
                createdBy: ug.gyms?.created_by,
                isVerified: ug.gyms?.is_verified,
                isDefault: ug.is_default,
                radius: ug.radius || 200,
                gymType: roleMap[ug.gym_id]?.type || 'community',
                role: roleMap[ug.gym_id]?.role || 'member'
            })) || [];

            const defaultGym = gyms.find(g => g.isDefault) || gyms[0];
            const effectiveGymId = defaultGym?.id || profile?.gym_id || null;

            console.log("fetchProfile: Complete. User:", profile?.username);

            // Return User
            const sessionUser = {
                id: session.user.id,
                email: session.user.email,
                name: profile?.name || session.user.email.split('@')[0],
                handle: profile?.username ? '@' + profile.username : null,
                avatar: profile?.avatar_url || session.user.user_metadata?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
                bio: profile?.bio || '',
                units: profile?.units || 'kg',
                gymId: effectiveGymId,
                gyms: gyms,
                auto_tracking_enabled: profile?.auto_tracking_enabled || false,
                privacy_settings: profile?.privacy_settings || { profile_visibility: 'public', gym_monitor_streaming: true, live_status: true },
                is_super_admin: profile?.is_super_admin || false,
                prs: profile?.prs || {}
            };

            // Persist
            PreferenceUtils.set(KEYS.USER_SESSION, sessionUser).catch(e => console.error("Pref Save Error", e));
            return sessionUser;

        } catch (err) {
            // Fix: Suppress AbortErrors (common in React Strict Mode or Navigation)
            if (err.name === 'AbortError' || err.message?.includes('AbortError')) {
                console.warn("fetchProfile: Request cancelled (AbortError) - Safe to ignore");
                return null;
            }
            console.error("fetchProfile: CRITICAL UNEXPECTED ERROR", err);
            throw err;
        }
    };

    const fetchProfileWithTimeout = async (session, retries = 1) => {
        // Increased timeout to 15s to handle slower connections
        // Reduced timeout to 5s to fail fast -> Reverted to 15s for stability
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 15000));

        try {
            return await Promise.race([fetchProfile(session), timeout]);
        } catch (e) {
            // Retry logic for timeouts
            if (retries > 0 && e.message === 'Profile fetch timeout') {
                console.warn(`fetchProfile: Timeout encountered, retrying... (${retries} left)`);
                return await fetchProfileWithTimeout(session, retries - 1);
            }

            console.error("Profile fetch timeout or error details:", JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
            // Return fallback user on timeout
            return {
                id: session.user.id,
                email: session.user.email,
                name: 'User (Offline)',
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

    // AUTH GUARD & LISTENER
    const isFetching = useRef(false);
    const lastFetchTime = useRef(0);
    const currentUserId = useRef(null); // Fix: Avoid stale closure in useEffect

    useEffect(() => {
        let mounted = true;

        const handleAuthChange = async (event, session) => {
            console.log("Auth Event:", event, session?.user?.email);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                if (session?.user) {
                    if (mounted) {
                        const now = Date.now();
                        // 1. Strict Debounce: if fetching, ignore
                        if (isFetching.current) {
                            console.log("handleAuthChange: Fetch already in progress, skipping.");
                            return;
                        }
                        // 2. Time Gate: using REF to avoid stale closure
                        if (currentUserId.current === session.user.id && (now - lastFetchTime.current < 2000)) {
                            console.log("handleAuthChange: Fetched recently (<2s), skipping.");
                            return;
                        }

                        isFetching.current = true;
                        try {
                            const appUser = await fetchProfileWithTimeout(session);
                            if (mounted) {
                                setUser(appUser);
                                currentUserId.current = appUser?.id || session.user.id; // Update Ref
                                PreferenceUtils.set(KEYS.USER_SESSION, appUser);
                                lastFetchTime.current = Date.now();
                            }
                        } finally {
                            isFetching.current = false;
                        }

                        // Only redirect if we are currently on auth pages
                        if (event === 'SIGNED_IN' && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
                            const params = new URLSearchParams(window.location.search);
                            const next = params.get('next');
                            if (next) {
                                router.push(next);
                            } else {
                                router.push('/');
                            }
                        }
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setUser(null);
                    currentUserId.current = null;
                    PreferenceUtils.remove(KEYS.USER_SESSION);
                    router.push('/login');
                }
            } else if (event === 'user_updated') {
                if (session?.user && mounted) {
                    // Force update, ignore time gate? Or respect it?
                    // user_updated usually implies data changed, so we should fetch.
                    isFetching.current = true;
                    try {
                        const appUser = await fetchProfileWithTimeout(session);
                        if (mounted) {
                            setUser(appUser);
                            currentUserId.current = appUser?.id;
                            PreferenceUtils.set(KEYS.USER_SESSION, appUser); // Persist session
                        }
                    } finally {
                        isFetching.current = false;
                    }
                }
            }
        };

        // Initialize and Listen
        const initAuth = async () => {
            // 0. Try Instant Load from Native Storage
            if (mounted && !user) {
                const localUser = await PreferenceUtils.get(KEYS.USER_SESSION);
                if (localUser && mounted) {
                    console.log("⚡ Instant Load from Preferences");
                    setUser(localUser);
                    currentUserId.current = localUser.id; // Sync Ref
                }
            }

            // Get initial session manually
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error("Auth session error:", error);
            }

            if (session?.user) {
                // Fix: Use handleAuthChange to share lock and logic
                await handleAuthChange('INITIAL_SESSION', session);
            } else {
                // No session, redirect if protected
                const isPublicRoute =
                    pathname.startsWith('/login') ||
                    pathname.startsWith('/signup') ||
                    pathname.startsWith('/profile/setup') ||
                    pathname.startsWith('/gym/display') ||
                    pathname.startsWith('/community');

                if (mounted && !isPublicRoute) {
                    const next = encodeURIComponent(pathname);
                    router.push(`/login?next=${next}`);
                }
            }

            const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
            return subscription;
        };

        let authSubscription = null;
        initAuth().then(sub => {
            authSubscription = sub;
        });

        return () => {
            mounted = false;
            if (authSubscription) authSubscription.unsubscribe();
        };
    }, []); // Only run once on mount

    // SEPARATE ROUTE PROTECTION removed - consolidated above


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

            // 2. Run Janitor (Cleanup stale sessions AND workouts)
            const hours = 4;
            const threshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

            // A. Stale Check-ins
            const { data: staleSessions } = await supabase
                .from('workout_sessions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .lt('start_time', threshold);

            if (staleSessions && staleSessions.length > 0) {
                for (const session of staleSessions) {
                    const sessionStart = new Date(session.start_time);
                    // Cap at threshold duration or fixed time?
                    // Let's say it ended 2 hours after start if we don't know.
                    // Or just set it to threshold.
                    const endTime = new Date(sessionStart.getTime() + 2 * 60 * 60 * 1000).toISOString();

                    await supabase
                        .from('workout_sessions')
                        .update({
                            status: 'timeout',
                            end_time: endTime,
                            duration: 7200, // 2h
                            auto_closed: true
                        })
                        .eq('id', session.id);
                }

                if (staleSessions.some(s => s.id === activeSession?.id)) {
                    setWorkoutSession(null);
                    alert(`Your gym session was auto-closed after ${hours} hours.`);
                }
            }

            // B. Stale Workouts (The actual logs)
            // If activeWorkout exists locally, check it too.
            // Also check DB for any zombies.
            const { data: staleWorkouts } = await supabase
                .from('workouts')
                .select('*')
                .eq('user_id', user.id)
                .is('end_time', null)
                .lt('start_time', threshold);

            if (staleWorkouts && staleWorkouts.length > 0) {
                for (const w of staleWorkouts) {
                    const wStart = new Date(w.start_time);
                    const endTime = new Date(wStart.getTime() + 90 * 60 * 1000).toISOString(); // Assume 90 mins

                    await supabase
                        .from('workouts')
                        .update({
                            end_time: endTime,
                            duration: 5400, // 90 mins
                            volume: 0, // We should calculate volume but difficult without logs here. 
                            // Assuming FinishWorkout handles volume usually.
                            // If auto-closing, we might miss volume calc if we don't join logs.
                            // Let's just close it. User can edit later.
                        })
                        .eq('id', w.id);
                }

                // If currently active locally
                if (activeWorkout && staleWorkouts.some(sw => sw.id === activeWorkout.id)) {
                    setActiveWorkout(null);
                    alert(`Your active workout was auto-closed because it was started over ${hours} hours ago.`);
                }
            }

            // 3. Global Janitor (RPC)
            try {
                // 4 Hours Cleanup
                await supabase.rpc('cleanup_stale_sessions', { timeout_minutes: 240 });
            } catch (err) {
                console.warn("Global cleanup RPC failed:", err);
            }
        };

        const interval = setInterval(syncAndClean, 5000); // Check every 5s
        syncAndClean();
        return () => clearInterval(interval);
    }, [user?.id]);

    // GLOBAL TRACKING ACTIONS
    const startTrackingSession = async (gymId, type = 'manual', gymName = null) => {
        console.log("startTrackingSession called with:", { gymId, type, gymName, userId: user?.id });

        if (!user?.id) {
            alert("Error: No user logged in.");
            return;
        }
        if (!gymId) {
            alert("Error: No Gym ID provided.");
            return;
        }

        const startTime = new Date().toISOString();

        // DB Insert
        const { data: session, error } = await supabase
            .from('workout_sessions')
            .insert({
                user_id: user.id,
                gym_id: gymId,
                start_time: startTime,
                status: 'active',
                type,
                is_private: user.privacy_settings?.live_status === false // Private if Live Status is OFF
            })
            .select('*, gyms(name)') // Fetch name join
            .single();

        if (error) {
            console.error("Start Session Error:", error);
            return;
        }

        setWorkoutSession(session);
    };

    const stopTrackingSession = async (reason = 'manual') => {
        if (!workoutSession) return;

        const endTime = new Date().toISOString();
        const duration = Math.round((new Date(endTime) - new Date(workoutSession.start_time)) / 1000);

        let status = 'completed';
        if (reason === 'timeout' || reason === 'auto-timeout') status = 'timeout';

        try {
            // If this session is part of a group, end ALL sessions in the group
            if (workoutSession.group_id) {
                console.log("Ending all sessions in group:", workoutSession.group_id);

                const { error: groupError } = await supabase
                    .from('workout_sessions')
                    .update({
                        end_time: endTime,
                        duration,
                        status: status
                    })
                    .eq('group_id', workoutSession.group_id)
                    .eq('status', 'active'); // Only end active sessions

                if (groupError) {
                    console.error("Error ending group sessions:", groupError);
                }
            } else {
                // Single session - just end this one
                const { error } = await supabase
                    .from('workout_sessions')
                    .update({
                        end_time: endTime,
                        duration,
                        status: status
                    })
                    .eq('id', workoutSession.id);

                if (error) {
                    console.error("Stop Session Error:", error);
                    return;
                }
            }

            setWorkoutSession(null);
            console.log("Session(s) ended successfully");
        } catch (err) {
            console.error("Error in stopTrackingSession:", err);
        }
    };

    // Fetch Friends Logic (Reusable)
    const fetchFriends = async () => {
        if (!user?.id) return;

        // 1. Get Friendships
        let friendIds = [];
        try {
            const { data: friendships, error: fsError } = await supabase
                .from('friendships')
                .select('user_id, friend_id')
                .eq('status', 'accepted')
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

            if (fsError) {
                console.error("Friendship fetch error:", JSON.stringify(fsError, null, 2));
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

            if (!wError && friendWorkouts) {
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
        }

        // 4. Get Live Activity
        let liveData = {};
        try {
            // A. Tracker Sessions (Gym Check-ins)
            // FILTER: Only show sessions from last 4 hours (prevents infinite zombie sessions)
            const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

            const { data: activeSessions } = await supabase
                .from('workout_sessions')
                .select('user_id, start_time, group_id, gym_id, gyms(name)')
                .in('user_id', friendIds)
                .eq('status', 'active')
                .gt('start_time', fourHoursAgo);

            // B. Active Workouts (Logs)
            const { data: activeLogs } = await supabase
                .from('workouts')
                .select('user_id, name, start_time, workout_logs(exercise_id, sets)')
                .in('user_id', friendIds)
                .in('user_id', friendIds)
                .is('end_time', null);

            // C. Default Gyms (Fallback Location)
            const { data: defaultGyms } = await supabase
                .from('user_gyms')
                .select('user_id, gyms(name)')
                .eq('is_default', true)
                .in('user_id', friendIds);

            const defaultGymMap = {};
            if (defaultGyms) {
                defaultGyms.forEach(ug => {
                    if (ug.gyms?.name) defaultGymMap[ug.user_id] = ug.gyms.name;
                });
            }

            // Merge into map
            if (activeSessions) {
                activeSessions.forEach(s => {
                    liveData[s.user_id] = {
                        tracker: {
                            location: s.gyms?.name || 'Unknown Gym',
                            startTime: s.start_time,
                            gym_id: s.gym_id
                        },
                        workout: null // Default null
                    };
                });
            }

            // Logs override tracker (more specific) or just exist
            if (activeLogs) {
                // 1. Collect all used IDs
                const allExIds = new Set();
                activeLogs.forEach(l => {
                    if (l.workout_logs) {
                        l.workout_logs.forEach(log => allExIds.add(log.exercise_id));
                    }
                });

                // 2. Filter unknown ones (not in local default definition)
                const unknownIds = [...allExIds].filter(id => !EXERCISES.find(e => e.id === id));

                // 3. Fetch from DB
                let customMap = {};
                if (unknownIds.length > 0) {
                    const { data: customExs } = await supabase
                        .from('custom_exercises')
                        .select('id, name')
                        .in('id', unknownIds);

                    if (customExs) {
                        customExs.forEach(e => customMap[e.id] = e.name);
                    }
                }

                activeLogs.forEach(l => {
                    // Calculate Detailed Status
                    let status = "Starting Workout";
                    let detail = l.name || 'Custom Workout';

                    // Default to the first exercise if nothing done
                    // We need to map logs to exercises to get names
                    if (l.workout_logs && l.workout_logs.length > 0) {
                        // Find first exercise with uncompleted sets
                        // We assume logs are somewhat ordered or we just take the first uncompleted one
                        const activeLog = l.workout_logs.find(log =>
                            log.sets.some(s => !s.completed)
                        ) || l.workout_logs[l.workout_logs.length - 1]; // Fallback to last if all done

                        if (activeLog) {
                            const exerciseDef = EXERCISES.find(e => e.id === activeLog.exercise_id);
                            const totalSets = activeLog.sets.length;
                            const completedSets = activeLog.sets.filter(s => s.completed).length;
                            const currentSet = Math.min(completedSets + 1, totalSets);

                            const exName = exerciseDef ? exerciseDef.name : (customMap[activeLog.exercise_id] || 'Unknown Exercise');

                            if (completedSets === totalSets) {
                                status = `Finished ${exName}`;
                            } else {
                                status = `${exName}`;
                                detail = `Set ${currentSet} of ${totalSets}`;
                            }
                        }
                    }

                    // Construct Live Data with strict separation
                    const trackerSession = liveData[l.user_id]; // Existing tracker from step A

                    // Workout Data
                    const workoutData = {
                        name: l.name || 'Custom Workout',
                        status: status,
                        detail: detail,
                        startTime: l.start_time,
                        fullLogs: l.workout_logs.map(log => ({
                            ...log,
                            exerciseName: (EXERCISES.find(e => e.id === log.exercise_id)?.name) || (customMap[log.exercise_id] || 'Unknown Exercise')
                        }))
                    };

                    // Merge or Create
                    if (trackerSession) {
                        trackerSession.workout = workoutData;
                    } else {
                        liveData[l.user_id] = {
                            tracker: null, // Explicitly null if no tracker session
                            workout: workoutData
                        };
                    }
                });
            }

            // Ensure friends with ONLY tracker session also have correct structure
            // (We already populated liveData with tracker sessions in step A, but structure was flat)
            // We need to re-structure the initial activeSessions loop to match new format if we didn't do it there.
            // Let's check step A activeSessions loop below this replacement block first.
            // ... Wait, step A loop was before this. I need to update step A too or fix it here.
            // Actually, I should update Step A first to use the nested structure, then Step B (logs) just appends.

            // Let's actually update the whole block including Step A and B to be safe.

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

    // Initial Fetch & Auto-Join Gym
    useEffect(() => {
        if (!user?.id || pathname.startsWith('/gym/display') || pathname.startsWith('/community')) {
            setFriends([]);
            return;
        }

        // Legacy Auto-join logic removed (superseded by Communities system)
        /*
        if (user.gymId) {
            supabase.from('gyms').select('name').eq('id', user.gymId).single()
                .then(({ data }) => {
                    joinGymCommunity(user.gymId, data?.name);
                });
        }
        */

        fetchFriends();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]); // Keep this simple

    // REALTIME SUBSCRIPTION FOR FRIENDS LIVE STATUS (Debounced)
    useEffect(() => {
        if (!user?.id) return;

        console.log("Setting up Realtime for Live Circle...");

        let debounceTimer;

        const handleRealtimeEvent = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log("Realtime: Debounced Fetch triggered");
                fetchFriends();
            }, 1000);
        };

        const channel = supabase
            .channel('live-circle')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_sessions' }, handleRealtimeEvent)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts' }, handleRealtimeEvent)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_logs' }, handleRealtimeEvent)
            .subscribe();

        return () => {
            clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                .not('end_time', 'is', null) // Only completed workouts
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

        // 1. Collect all Exercise IDs
        const allIds = new Set();
        data.forEach(w => w.logs.forEach(l => allIds.add(l.exercise_id)));

        // 2. Separate Unknown IDs (not in standard EXERCISES)
        const unknownIds = [...allIds].filter(id => !EXERCISES.find(e => e.id === id));

        // 3. Fetch Custom Exercises
        let customMap = {};
        if (unknownIds.length > 0) {
            const { data: customExs } = await supabase
                .from('custom_exercises')
                .select('id, name')
                .in('id', unknownIds);

            if (customExs) {
                customExs.forEach(e => customMap[e.id] = e.name);
            }
        }

        // 4. Map Data
        return data.map(w => ({
            id: w.id,
            name: w.name,
            startTime: w.start_time,
            endTime: w.end_time,
            volume: w.volume,
            exercises: w.logs.map(l => {
                const ex = EXERCISES.find(e => e.id === l.exercise_id);
                return {
                    id: l.exercise_id,
                    name: ex ? ex.name : (customMap[l.exercise_id] || 'Unknown Exercise'),
                    sets: l.sets
                };
            })
        }));
    };

    const removeFriend = async (friendId) => {
        if (!user) {
            console.error("removeFriend: No user logged in");
            return false;
        }

        console.log("removeFriend: Attempting to remove friend", friendId);

        try {
            // Delete friendship - need to handle both directions
            // First try: I am user_id, they are friend_id
            const { error: error1 } = await supabase
                .from('friendships')
                .delete()
                .eq('user_id', user.id)
                .eq('friend_id', friendId);

            // Second try: They are user_id, I am friend_id
            const { error: error2 } = await supabase
                .from('friendships')
                .delete()
                .eq('user_id', friendId)
                .eq('friend_id', user.id);

            if (error1) console.warn("removeFriend: Error in first delete:", error1);
            if (error2) console.warn("removeFriend: Error in second delete:", error2);

            // Update local state
            setFriends(prev => prev.filter(f => f.id !== friendId));
            console.log("removeFriend: Successfully removed friend");
            return true;
        } catch (err) {
            console.error("removeFriend failed:", err);
            return false;
        }
    };

    // RESTORE ACTIVE WORKOUT ON LOAD
    useEffect(() => {
        if (!user) return;

        const fetchActive = async () => {
            const { data, error } = await supabase
                .from('workouts')
                .select(`
                    id, name, start_time, template_id,
                    logs:workout_logs(exercise_id, sets)
                `)
                .eq('user_id', user.id)
                .is('end_time', null)
                .maybeSingle();

            if (data) {
                // Map DB structure to App structure
                // DB: logs is array of { exercise_id, sets }
                const restoredLogs = data.logs.map(log => ({
                    exerciseId: log.exercise_id,
                    sets: log.sets
                }));

                setActiveWorkout({
                    id: data.id,
                    templateId: data.template_id,
                    name: data.name,
                    startTime: data.start_time,
                    volume: 0,
                    duration: 0,
                    logs: restoredLogs
                });
                console.log("Restored active workout:", data.id);
            }
        };

        fetchActive();
    }, [user]);



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
    const startWorkout = async (templateId) => {
        if (!user) {
            alert("Please sign in to start a workout.");
            return;
        }

        console.log(`Attempting to start workout with ID: ${templateId}`);
        const template = workoutTemplates.find(t => t.id === templateId);

        if (!template) {
            console.error(`Template not found for ID: ${templateId}`);
            alert("Error: Template not found. Please refresh.");
            return;
        }

        const startTime = new Date().toISOString();

        // 1. Create Initial Session Object (Optimistic)
        const initialLogs = template.exercises.map(ex => {
            let numSets = 3; // Default to 3 sets
            if (ex.sets && Array.isArray(ex.sets)) numSets = ex.sets.length;
            else if (ex.sets && typeof ex.sets === 'number') numSets = ex.sets;
            else if (ex.targetSets) numSets = ex.targetSets;

            const rawSets = Array(numSets).fill(0).map(() => ({
                id: Math.random().toString(36).substr(2, 9),
                weight: 0,
                reps: '',
                completed: false,
                timestamp: null
            }));
            const sets = JSON.parse(JSON.stringify(rawSets));

            return {
                exerciseId: ex.id,
                sets: sets
            };
        });

        // 2. Insert into DB immediately to secure persistence
        try {
            const { data: dbSession, error } = await supabase
                .from('workouts')
                .insert({
                    user_id: user.id,
                    name: template.name,
                    template_id: templateId,
                    start_time: startTime,
                    end_time: null // Open session
                })
                .select()
                .single();

            if (error) throw error;

            console.log("Started DB Session:", dbSession.id);

            // 3. Set Active Workout using REAL ID
            setActiveWorkout({
                id: dbSession.id, // REAL UUID
                templateId,
                name: template.name,
                startTime: startTime,
                volume: 0,
                duration: 0,
                logs: initialLogs
            });

            // 4. Initial Save of Logs (Empty placeholders)
            const logsToInsert = initialLogs.map(log => ({
                workout_id: dbSession.id,
                exercise_id: log.exerciseId,
                sets: log.sets
            }));

            await supabase.from('workout_logs').insert(logsToInsert);

        } catch (err) {
            console.error("Failed to start workout session:", err);
            alert("Could not start workout. Check connection.");
        }
    };

    // Check In (Start Session)
    const checkInGym = async (gymId, gymName, isAuto = false, existingGroupId = null) => {
        if (!user) return;
        try {
            // Generate a group_id if not joining an existing group
            const groupId = existingGroupId || crypto.randomUUID();

            const startTime = new Date().toISOString();
            const { data, error } = await supabase
                .from('workout_sessions')
                .insert({
                    user_id: user.id,
                    gym_id: gymId,
                    start_time: startTime,
                    status: 'active',
                    type: isAuto ? 'auto' : 'manual',
                    group_id: groupId
                })
                .select()
                .single();

            if (error) throw error;

            setWorkoutSession(data);
        } catch (err) {
            console.error("Check-in failed:", err);
            alert("Check-in failed.");
        }
    };

    // Action: Finish Workout
    const finishWorkout = async ({ visibility = 'public' } = {}) => {
        if (!activeWorkout || !user) return;

        // Stop the tracking session (Gym Check-in) as well
        // This ensures the Host status is updated and group session is closed
        if (workoutSession) {
            await stopTrackingSession('manual');
        }

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
        // setHistory(prev => [completedSession, ...prev]); // Removed: history is for workout_sessions in this file usually? 
        // Actually store.js defines history as PAST WORKOUTS (line 15).
        setHistory(prev => [completedSession, ...prev]);
        setActiveWorkout(null);

        // Save to Supabase (UPDATE existing or INSERT if not found/error)
        try {
            let workoutId = activeWorkout.id;

            // Check if ID is a temp ID (starts with temp-)
            // If so, we never successfully created the DB row, so we must INSERT now.
            if (String(workoutId).startsWith('temp-')) {
                const { data: workoutData, error: insertError } = await supabase
                    .from('workouts')
                    .insert({
                        user_id: user.id,
                        name: activeWorkout.name,
                        template_id: activeWorkout.templateId,
                        start_time: activeWorkout.startTime,
                        end_time: endTime,
                        volume: totalVolume,
                        duration: duration,
                        visibility: visibility
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                workoutId = workoutData.id;
            } else {
                // UPDATE existing
                const { error: updateError } = await supabase
                    .from('workouts')
                    .update({
                        end_time: endTime,
                        volume: totalVolume,
                        duration: duration,
                        visibility: visibility
                    })
                    .eq('id', workoutId);

                if (updateError) throw updateError;
            }

            // 2. Clear Old Logs (if any) to prevent duplication or conflicts
            await supabase
                .from('workout_logs')
                .delete()
                .eq('workout_id', workoutId);

            // 3. Insert Fresh Logs
            const logsToInsert = activeWorkout.logs
                .filter(log => log.exerciseId) // FILTER OUT BAD LOGS
                .map(log => ({
                    workout_id: workoutId,
                    exercise_id: log.exerciseId,
                    sets: log.sets
                }));

            if (logsToInsert.length > 0) {
                const { error: logsError } = await supabase
                    .from('workout_logs')
                    .insert(logsToInsert);

                if (logsError) throw logsError;
            }

        } catch (err) {
            console.error("Failed to save/update workout:", err);
            console.error("Error Detail:", JSON.stringify(err, null, 2));
            alert("Error saving workout. Check console."); // Notify user immediately
        }
    };

    // Ref for Debouncing
    const saveTimeouts = useRef({});

    // Action: Log Set
    const logSet = (exerciseId, setIndex, data) => {
        setActiveWorkout(prev => {
            if (!prev) return null;

            const newLogs = prev.logs.map(log => {
                if (log.exerciseId !== exerciseId) return log;

                // Ensure sets array has enough items
                const newSets = [...log.sets];

                // Allow data to override completed status (default true if not provided)
                const isCompleted = data.completed !== undefined ? data.completed : true;

                newSets[setIndex] = {
                    ...newSets[setIndex], // Preserve ID and other existing fields
                    ...data,
                    completed: isCompleted,
                    timestamp: new Date().toISOString()
                };

                return { ...log, sets: newSets };
            });

            // SYNC TO DB (Debounced)
            // We update the specific row for this exercise
            const updatedLog = newLogs.find(l => l.exerciseId === exerciseId);
            if (updatedLog) {
                const key = `${exerciseId}`;

                // Clear existing timeout for this exercise
                if (saveTimeouts.current[key]) {
                    clearTimeout(saveTimeouts.current[key]);
                }

                // Set new timeout (1 second debounce)
                saveTimeouts.current[key] = setTimeout(() => {
                    supabase
                        .from('workout_logs')
                        .update({ sets: updatedLog.sets })
                        .eq('workout_id', prev.id)
                        .eq('exercise_id', exerciseId)
                        .then(({ error }) => {
                            if (error) console.error("Auto-save log failed:", error);
                        });
                }, 1000);
            }

            return { ...prev, logs: newLogs };
        });
    };

    const addSetToWorkout = (exerciseId) => {
        setActiveWorkout(prev => {
            if (!prev) return null;
            const newLogs = prev.logs.map(log => {
                if (log.exerciseId !== exerciseId) return log;

                const newSet = {
                    id: Math.random().toString(36).substr(2, 9),
                    weight: 0,
                    reps: '',
                    completed: false,
                    timestamp: null
                };

                return { ...log, sets: [...log.sets, newSet] };
            });
            return { ...prev, logs: newLogs };
        });
    };

    const removeSetFromWorkout = (exerciseId, setIndex) => {
        setActiveWorkout(prev => {
            if (!prev) return null;
            const newLogs = prev.logs.map(log => {
                if (log.exerciseId !== exerciseId) return log;

                // Prevent removing the last set? Optional, but good UX usually.
                if (log.sets.length <= 1) return log;

                const newSets = log.sets.filter((_, idx) => idx !== setIndex);
                return { ...log, sets: newSets };
            });
            return { ...prev, logs: newLogs };
        });
    };

    const addExerciseToWorkout = async (exerciseId) => {
        if (!activeWorkout) return;

        // Block duplicates to prevent logSet ambiguity (updating multiple blocks)
        if (activeWorkout.logs.some(l => l.exerciseId === exerciseId)) {
            alert("This exercise is already in the workout. Add sets to the existing block instead.");
            return;
        }

        const newLog = {
            exerciseId,
            sets: [{
                id: Math.random().toString(36).substr(2, 9),
                weight: 0,
                reps: '',
                completed: false,
                timestamp: null
            }]
        };

        // Optimistic
        setActiveWorkout(prev => ({
            ...prev,
            logs: [...prev.logs, newLog]
        }));

        try {
            await supabase.from('workout_logs').insert({
                workout_id: activeWorkout.id,
                exercise_id: exerciseId,
                sets: newLog.sets
            });
        } catch (err) {
            console.error("Error adding exercise to DB:", err);
            // Revert?
        }
    };

    const removeExerciseFromWorkout = async (exerciseId) => {
        if (!activeWorkout) return;

        // Optimistic
        setActiveWorkout(prev => ({
            ...prev,
            logs: prev.logs.filter(l => l.exerciseId !== exerciseId)
        }));

        try {
            await supabase.from('workout_logs')
                .delete()
                .eq('workout_id', activeWorkout.id)
                .eq('exercise_id', exerciseId);
        } catch (err) {
            console.error("Error removing exercise from DB:", err);
        }
    };






    // HISTORY SESSION MANAGEMENT
    const deleteSession = async (sessionId) => {
        console.log("DEBUG: v3 Starting deleteSession for", sessionId);

        // Optimistic Remove
        const previousHistory = [...(history || [])];
        try {
            // Optimistic update
            setHistory(prev => {
                if (!Array.isArray(prev)) return [];
                return prev.filter(s => s.id !== sessionId);
            });
        } catch (e) {
            console.error("Optimistic update failed:", e);
            // Continue to DB delete even if local state fails
        }

        try {
            const response = await supabase.from('workout_sessions').delete().eq('id', sessionId);
            const { error, count } = response;

            console.log("Supabase response:", response);

            if (error) {
                console.error("Supabase DELETE Error:", error);
                throw error;
            }

            console.log("Delete successful. Rows affected:", count); // count header might be missing if not selected

        } catch (err) {
            console.error("Delete session EXCEPTION:", err);
            // Only revert if it was a real DB error
            setHistory(previousHistory);
            alert("Delete Diag: " + (err.message || JSON.stringify(err)));
        }
    };

    const updateSession = async (sessionId, updates) => {
        try {
            // updates: { start_time, end_time, gym_id? }
            const { error } = await supabase.from('workout_sessions').update(updates).eq('id', sessionId);
            if (error) throw error;

            setRecentSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updates } : s));
        } catch (err) {
            console.error("Update session failed:", err);
            alert("Failed to update session");
        }
    };

    // Create Manual Workout (for logging past workouts)
    const createManualWorkout = async ({ name, date, duration, volume, logs = [] }) => {
        if (!user) {
            console.error("createManualWorkout: No user logged in");
            return false;
        }

        console.log("createManualWorkout:", { name, date, duration, volume, logs });

        try {
            const startTime = new Date(date);
            const endTime = new Date(startTime.getTime() + duration * 1000);

            const { data: workout, error } = await supabase
                .from('workouts')
                .insert({
                    user_id: user.id,
                    name: name,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    duration: duration,
                    volume: volume
                })
                .select()
                .single();

            if (error) throw error;

            console.log("Manual workout created:", workout.id);

            // Save workout logs if provided
            if (logs && logs.length > 0) {
                const logsToInsert = logs.map(log => ({
                    workout_id: workout.id,
                    exercise_id: log.exerciseId,
                    sets: log.sets
                }));

                const { error: logsError } = await supabase
                    .from('workout_logs')
                    .insert(logsToInsert);

                if (logsError) {
                    console.error("Error saving workout logs:", logsError);
                }
            }

            // Refresh history
            const { data: updatedHistory } = await supabase
                .from('workouts')
                .select(`
                    id, name, start_time, end_time, volume, duration,
                    logs:workout_logs(exercise_id, sets)
                `)
                .eq('user_id', user.id)
                .not('end_time', 'is', null)
                .order('end_time', { ascending: false });

            if (updatedHistory) {
                const formatted = updatedHistory.map(w => ({
                    id: w.id,
                    name: w.name,
                    startTime: w.start_time,
                    endTime: w.end_time,
                    volume: w.volume,
                    duration: w.duration,
                    logs: w.logs.map(l => ({
                        exerciseId: l.exercise_id,
                        sets: l.sets
                    }))
                }));
                setHistory(formatted);
            }

            return true;
        } catch (err) {
            console.error("createManualWorkout failed:", err);
            return false;
        }
    };

    // Action: Cancel Workout (Deletes it completely)
    const cancelWorkout = async () => {
        if (!activeWorkout) return;
        const id = activeWorkout.id;
        setActiveWorkout(null); // Optimistic clear

        try {
            await supabase.from('workout_logs').delete().eq('workout_id', id);
            await supabase.from('workouts').delete().eq('id', id);
        } catch (err) {
            console.error("Error cancelling workout:", err);
        }
    };



    // Action: Delete History Entry
    const deleteWorkoutHistory = async (workoutId) => {
        // Optimistic Remove
        setHistory(prev => prev.filter(w => w.id !== workoutId));

        try {
            console.log("Attempting Delete for:", workoutId);
            const { error } = await supabase
                .from('workouts')
                .delete()
                .eq('id', workoutId)
                .eq('user_id', user.id); // Redundant if RLS checks it, but good safety

            if (error) {
                console.error("Delete Error:", error);
                throw error;
            }
            console.log("Delete successful");

        } catch (err) {
            console.error("Error deleting history:", err);
            // Restore state if failed
            const { data } = await supabase.from('workouts').select('*').eq('id', workoutId).maybeSingle();
            if (data) {
                alert("Delete failed. Restoring item.");
                // We'd need to re-fetch full history to restore cleanly
                // fetchHistory(); 
            } else {
                alert("Delete failed: " + (err.message || JSON.stringify(err)));
            }
        }
    };

    const updateWorkoutHistory = async (workoutId, newSessionData) => {
        try {
            // 1. Update Workout Meta (Volume, etc if changed?)
            // We should recalculate volume
            let totalVolume = 0;
            newSessionData.logs.forEach(log => {
                log.sets.forEach(s => {
                    const w = parseFloat(s.weight) || 0;
                    const r = parseFloat(s.reps) || 0;
                    if (s.completed || w > 0) totalVolume += w * r;
                });
            });

            // Update workout row
            const { error: wError } = await supabase
                .from('workouts')
                .update({
                    volume: totalVolume,
                    visibility: newSessionData.visibility // Update visibility
                    // user might want to edit name or date too? For now just logs/volume.
                })
                .eq('id', workoutId);

            if (wError) throw wError;

            // 2. Update Logs
            // Strategy: Delete all logs and re-insert. 
            // This handles added/removed exercises or re-ordering easily.
            const { error: delError } = await supabase
                .from('workout_logs')
                .delete()
                .eq('workout_id', workoutId);

            if (delError) throw delError;

            const logsToInsert = newSessionData.logs.map(log => ({
                workout_id: workoutId,
                exercise_id: log.exerciseId,
                sets: log.sets
            }));

            if (logsToInsert.length > 0) {
                const { error: insError } = await supabase
                    .from('workout_logs')
                    .insert(logsToInsert);

                if (insError) throw insError;
            }

            // 3. Update Local State
            setHistory(prev => prev.map(w => {
                if (w.id === workoutId) {
                    return { ...w, ...newSessionData, volume: totalVolume };
                }
                return w;
            }));

        } catch (err) {
            console.error("Update history error:", err);
            throw err;
        }
    };

    const shareWorkout = async (workout, friendId) => {
        if (!user) return false;

        try {
            // 1. Find or Create Chat
            let conversationId = null;
            const { data: existingChats } = await supabase.from('conversation_participants').select('conversation_id, conversations!inner(type)').eq('user_id', user.id);

            if (existingChats) {
                for (const chat of existingChats) {
                    if (chat.conversations.type !== 'private') continue;
                    const { data: members } = await supabase.from('conversation_participants').select('user_id').eq('conversation_id', chat.conversation_id);
                    if (members && members.length === 2 && members.some(m => m.user_id === friendId)) {
                        conversationId = chat.conversation_id;
                        break;
                    }
                }
            }

            if (!conversationId) {
                const { data: newConv } = await supabase.from('conversations').insert({ type: 'private' }).select().single();
                conversationId = newConv.id;
                await supabase.from('conversation_participants').insert([
                    { conversation_id: newConv.id, user_id: user.id },
                    { conversation_id: newConv.id, user_id: friendId }
                ]);
            }

            // 2. Send Message
            const shareMessage = {
                conversation_id: conversationId,
                sender_id: user.id,
                content: `${user.name} shared a finished workout: ${workout.name}`,
                type: 'workout_share',
                metadata: {
                    workoutId: workout.id,
                    name: workout.name,
                    date: workout.endTime,
                    volume: workout.volume,
                    visibility: workout.visibility
                }
            };

            const { error: msgError } = await supabase.from('messages').insert(shareMessage);
            if (msgError) throw msgError;

            // 3. Notification
            await supabase.from('notifications').insert({
                user_id: friendId,
                type: 'workout_share',
                title: 'Workout Shared',
                message: `${user.name} shared a workout with you.`,
                data: {
                    workoutId: workout.id,
                    sharerId: user.id
                }
            });

            return true;
        } catch (err) {
            console.error("shareWorkout failed:", err);
            return false;
        }
    };


    // TEMPLATE ACTIONS
    const fetchTemplates = async () => {
        if (typeof window !== 'undefined' && window.location.pathname.includes('/gym/display')) return;
        if (!user || pathname.startsWith('/community')) return;
        const { data, error } = await supabase
            .from('workout_templates')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching templates:", JSON.stringify(error, null, 2));
        } else {
            setWorkoutTemplates(data || []);
        }
    };

    // Load templates on user load
    useEffect(() => {
        if (user) fetchTemplates();
    }, [user]);

    const addWorkoutTemplate = async (template) => {
        // Optimistic
        const tempId = 'temp-' + Date.now();
        const optimistic = { ...template, id: tempId, user_id: user.id };
        setWorkoutTemplates(prev => [...prev, optimistic]);

        try {
            const { data, error } = await supabase
                .from('workout_templates')
                .insert({
                    user_id: user.id,
                    name: template.name,
                    visibility: template.visibility || 'public',
                    exercises: template.exercises
                })
                .select()
                .single();

            if (error) throw error;

            // Replace temp with real
            setWorkoutTemplates(prev => prev.map(t => t.id === tempId ? data : t));
            return data;
        } catch (err) {
            console.error("Error creating template:", err);
            // Revert
            setWorkoutTemplates(prev => prev.filter(t => t.id !== tempId));
            return null;
        }
    };

    const updateWorkoutTemplate = async (id, updates) => {
        // Optimistic
        setWorkoutTemplates(prev => prev.map(t =>
            t.id === id ? { ...t, ...updates } : t
        ));

        try {
            const { error } = await supabase
                .from('workout_templates')
                .update({
                    name: updates.name,
                    visibility: updates.visibility,
                    exercises: updates.exercises,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error("Error updating template:", err);
            // Revert (requires fetching or keeping previous state - simplifying here)
            fetchTemplates();
        }
    };

    const deleteWorkoutTemplate = async (id) => {
        // Optimistic
        setWorkoutTemplates(prev => prev.filter(t => t.id !== id));

        // Validation: If not a valid UUID (e.g., 't1', 't2'), skip DB delete to avoid 22P02 error
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (!isUUID) return;

        try {
            const { error } = await supabase
                .from('workout_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error("Error deleting template:", err);
            fetchTemplates();
        }
    };

    // CUSTOM EXERCISES
    const fetchCustomExercises = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('custom_exercises')
            .select('*')
            .eq('user_id', user.id);

        if (data) {
            // merge with default exercises
            setExercises(prev => {
                const defaults = EXERCISES; // Reset to base to avoid duplicates if re-fetching
                return [...defaults, ...data];
            });
        }
    };

    useEffect(() => {
        if (user) fetchCustomExercises();
    }, [user]);

    const addCustomExercise = async (name, muscle = 'Other') => {
        if (!user) {
            console.error("Cannot create exercise: User not logged in");
            return null;
        }

        const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
        const newEx = {
            id,
            name,
            muscle,
            isCustom: true // Helper flag
        };

        // Optimistic
        setExercises(prev => [...prev, newEx]);

        try {
            const { error } = await supabase
                .from('custom_exercises')
                .insert({
                    id,
                    user_id: user.id,
                    name,
                    muscle
                });

            if (error) throw error;
        } catch (err) {
            console.error("Error creating custom exercise:", err);
            // Revert
            setExercises(prev => prev.filter(e => e.id !== id));
            alert("Failed to create exercise.");
            return null;
        }
        return newEx;
    };

    const deleteCustomExercise = async (id) => {
        if (!user) return;

        // Optimistic
        setExercises(prev => prev.filter(e => e.id !== id));

        try {
            const { error } = await supabase
                .from('custom_exercises')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id); // Security check

            if (error) throw error;
        } catch (err) {
            console.error("Error deleting custom exercise:", err);
            fetchCustomExercises(); // Revert/Refresh
            alert("Failed to delete exercise.");
        }
    };

    const updateCustomExercise = async (id, name, muscle) => {
        try {
            const { error } = await supabase
                .from('custom_exercises')
                .update({ name, muscle })
                .eq('id', id)
                .eq('user_id', user.id); // Security: only owner can edit

            if (error) throw error;

            setExercises(prev => prev.map(e =>
                e.id === id ? { ...e, name, muscle } : e
            ));
            return true;
        } catch (err) {
            console.error("Failed to update custom exercise:", err);
            return false;
        }
    };

    const updateUserProfile = (localUpdates) => {
        // Local state update (legacy name, used for optimistic updates)
        setUser(prev => ({ ...prev, ...localUpdates }));
    };

    const updateProfileData = async (updates) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            setUser(prev => ({ ...prev, ...updates }));
            return true;
        } catch (err) {
            console.error("Profile Update Error:", err);
            return false;
        }
    };

    const updatePrivacySettings = async (settings) => {
        if (!user) return;
        const newSettings = { ...user.privacy_settings, ...settings };

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ privacy_settings: newSettings })
                .eq('id', user.id);

            if (error) throw error;

            setUser(prev => ({
                ...prev,
                privacy_settings: newSettings
            }));

            // Real-time effect: If turning off Live Status, update active session
            if (activeWorkout && settings.live_status === false) {
                // But wait, activeWorkout is local state. Database session?
                if (workoutSession) {
                    await supabase.from('workout_sessions')
                        .update({ is_private: true })
                        .eq('id', workoutSession.id);
                }
            }

            return true;
        } catch (err) {
            console.error("Privacy Settings Error:", JSON.stringify(err, null, 2));
            return false;
        }
    };

    const updateUserGym = async (gymId, updates) => {
        try {
            const { error } = await supabase
                .from('user_gyms')
                .update(updates)
                .eq('user_id', user.id)
                .eq('gym_id', gymId);

            if (error) throw error;

            // Refresh user profile/gyms locally
            await fetchProfile({ user: { id: user.id } }).then(appUser => setUser(prev => ({ ...prev, gyms: appUser.gyms })));
            return { success: true };
        } catch (err) {
            console.error("Failed to update user gym:", err);
            return { success: false, error: err };
        }
    };

    const saveUserGym = async (name, lat, lng, label = 'My Gym', address = null, source = 'manual') => {
        if (!user) return;
        console.log("saveUserGym: Starting...", { name, lat, lng });
        try {
            // 1. Create Gym Entry
            console.log("saveUserGym: 1. Creating Gym...");
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

            if (gError) {
                console.error("saveUserGym: Gym Error", gError);
                throw gError;
            }
            console.log("saveUserGym: Gym Created", gym?.id);

            // 2. Create Community for this Gym
            console.log("saveUserGym: 2. Creating Community...");
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
            else console.log("saveUserGym: Community Created", community?.id);

            // 3. Create Conversation
            console.log("saveUserGym: 3. Creating Conversation...");
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
            else console.log("saveUserGym: Conversation Created", conversation?.id);

            // 4. Link to User (Gym)
            console.log("saveUserGym: 4. Linking User Gym...");
            const { error: ugError } = await supabase
                .from('user_gyms')
                .insert({
                    user_id: user.id,
                    gym_id: gym.id,
                    label,
                    is_default: (user.gyms?.length === 0)
                });

            if (ugError) {
                console.error("saveUserGym: UserGym Error", ugError);
                throw ugError;
            }

            // 5. Join Community & Chat
            console.log("saveUserGym: 5. Joining Community/Chat...");
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
            console.log("saveUserGym: 5. Done joining.");

            // 6. Refresh
            console.log("saveUserGym: 6. Refreshing Data...");
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

    const updateGym = async (gymId, updates) => {
        try {
            console.log("Updating gym:", gymId, updates);
            // Verify payload
            if (updates.location && !updates.location.startsWith('POINT')) {
                console.error("Invalid location format:", updates.location);
            }

            const { error, data } = await supabase
                .from('gyms')
                .update(updates)
                .eq('id', gymId)
                .eq('created_by', user.id) // Security check via Store (RLS also needed)
                .select();

            if (error) {
                console.error("Supabase Update Error:", error);
                throw error;
            }

            if (!data || data.length === 0) {
                console.error("Update returned no data. Check RLS or ownership.");
                throw new Error("Update failed. You might not have permission to edit this gym.");
            }
            console.log("Update success, data:", data);

            // Optimistic Update: Update local state immediately before fetching
            setUser(prev => {
                if (!prev || !prev.gyms) return prev;
                const updatedGyms = prev.gyms.map(g => {
                    if (g.id === gymId) {
                        return {
                            ...g,
                            name: updates.name || g.name,
                            address: updates.address || g.address,
                            // If location string is raw WKT, keep it. 
                            // Or parses it? The frontend expects WKT usually or parsed object?
                            // Store keeps WKT for location.
                            location: updates.location || g.location
                        };
                    }
                    return g;
                });
                return { ...prev, gyms: updatedGyms };
            });

            // Then Refresh Profile (Background sync)
            // DELAYED to prevent race condition where DB read replica returns stale data
            // overturning our optimistic update.
            setTimeout(async () => {
                const session = await supabase.auth.getSession();
                if (session?.data?.session) {
                    const refreshedUser = await fetchProfile(session.data.session);
                    if (refreshedUser) {
                        // Only merge if we still have a session? 
                        // Actually, maybe just don't merge if it looks like the old data?
                        // For now, let's just rely on the optimistic update as the primary source of truth for this session.
                        console.log("Background profile refresh completed.");
                        // setUser(prev => ({ ...prev, ...refreshedUser })); 
                        // DISABLED auto-merge to avoid "flicker back" to old address.
                    }
                }
            }, 5000);

            return true;
        } catch (err) {
            console.error("Update Gym Error:", err);
            throw err;
        }
    };

    const deleteGlobalGym = async (gymId) => {
        try {
            // Unlink from profile first to prevent FK violation
            if (user?.gymId === gymId) {
                await supabase.from('profiles').update({ gym_id: null }).eq('id', user.id);
            }

            // Manually Cascade: Delete all user_gyms associations first
            await supabase.from('user_gyms').delete().eq('gym_id', gymId);

            const { error } = await supabase
                .from('gyms')
                .delete()
                .eq('id', gymId)
                .eq('created_by', user.id);

            if (error) throw error;

            console.log("Global gym deleted successfully");

            // Local update
            setUser(prev => ({
                ...prev,
                gyms: prev.gyms.filter(g => g.id !== gymId),
                gymId: prev.gymId === gymId ? null : prev.gymId
            }));
        } catch (err) {
            console.error("Delete Global Gym Error:", err.message || JSON.stringify(err));
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
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 4); // Top 4
    };

    const getExercisePR = (exerciseId) => {
        let maxWeight = 0;

        history.forEach(session => {
            const log = session.logs.find(l => l.exerciseId === exerciseId);
            if (!log) return;

            log.sets.forEach(set => {
                if (set.completed && set.weight > maxWeight) {
                    maxWeight = set.weight;
                }
            });
        });

        return maxWeight > 0 ? maxWeight : null;
    };

    const getExerciseHistory = (exerciseId) => {
        // Find last session where this exercise was performed
        // history is typically sorted by date DESC, so find() gets the latest
        const lastSession = history.find(s =>
            s.logs.some(l => l.exerciseId === exerciseId)
        );

        if (!lastSession) return null;

        const log = lastSession.logs.find(l => l.exerciseId === exerciseId);
        return log ? log.sets : null;
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

    const joinCommunity = async (communityId, gymId, gymName, consentGiven = false) => {
        try {
            // 1. Join the community
            const payload = { community_id: communityId, user_id: user.id };
            if (consentGiven) {
                payload.monitor_consent_at = new Date().toISOString();
            }

            const { error: joinError } = await supabase
                .from('community_members')
                .insert(payload);

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

    const joinSession = async (groupId, gymId) => {
        if (!user?.id) return false;

        try {
            // Find the host's session to get the start_time
            const { data: hostSession, error: hostError } = await supabase
                .from('workout_sessions')
                .select('start_time, user_id')
                .eq('group_id', groupId)
                .eq('status', 'active')
                .order('created_at', { ascending: true }) // First session is the host
                .limit(1)
                .maybeSingle();

            if (hostError) {
                console.error("Error finding host session:", hostError);
                throw hostError;
            }

            if (!hostSession) {
                alert("Session not found or already ended");
                return false;
            }

            // Use the host's start_time for synchronized timer
            const { data: session, error } = await supabase
                .from('workout_sessions')
                .insert({
                    user_id: user.id,
                    gym_id: gymId,
                    group_id: groupId, // Join the existing group
                    start_time: hostSession.start_time, // Use host's start time!
                    status: 'active',
                    type: 'manual'
                })
                .select('*, gyms(name)')
                .single();

            if (error) throw error;
            setWorkoutSession(session);
            console.log("Joined session with shared start_time:", session);
            return true;
        } catch (err) {
            console.error("Error joining session:", err);
            alert("Failed to join session");
            return false;
        }
    };

    const inviteToSession = async (friendId, sessionId) => {
        if (!user || !workoutSession) {
            console.log("inviteToSession: Missing user or session");
            return false;
        }

        try {
            // 1. Find or create chat with friend
            let conversationId = null;

            // Check if chat exists
            const { data: existingChats, error: chatError } = await supabase
                .from('conversation_participants')
                .select('conversation_id, conversations!inner(type)')
                .eq('user_id', user.id);

            if (chatError) {
                console.error("Error fetching chats:", chatError);
                throw chatError;
            }

            if (existingChats) {
                for (const chat of existingChats) {
                    if (chat.conversations.type !== 'private') continue;

                    const { data: members } = await supabase
                        .from('conversation_participants')
                        .select('user_id')
                        .eq('conversation_id', chat.conversation_id);

                    if (members && members.length === 2 && members.some(m => m.user_id === friendId)) {
                        conversationId = chat.conversation_id;
                        break;
                    }
                }
            }

            // Create chat if doesn't exist
            if (!conversationId) {
                const { data: newConv, error: convError } = await supabase
                    .from('conversations')
                    .insert({ type: 'private' })
                    .select()
                    .single();

                if (convError) {
                    console.error("Error creating conversation:", convError);
                    throw convError;
                }
                conversationId = newConv.id;

                // Add members
                const { error: membersError } = await supabase
                    .from('conversation_participants')
                    .insert([
                        { conversation_id: conversationId, user_id: user.id },
                        { conversation_id: conversationId, user_id: friendId }
                    ]);

                if (membersError) {
                    console.error("Error adding members:", membersError);
                    throw membersError;
                }
            }

            // 2. Send invite message with metadata
            const inviteMessage = {
                conversation_id: conversationId,
                sender_id: user.id,
                content: `${user.name} invited you to join their workout at ${workoutSession.gyms?.name || 'the gym'}!`,
                type: 'workout_invite',
                metadata: {
                    sessionId: workoutSession.id,
                    groupId: workoutSession.group_id,
                    gymId: workoutSession.gym_id,
                    gymName: workoutSession.gyms?.name
                }
            };

            const { error: msgError } = await supabase
                .from('messages')
                .insert(inviteMessage);

            if (msgError) {
                console.error("Error sending message:", msgError);
                throw msgError;
            }

            // 3. Create notification
            const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                    user_id: friendId,
                    type: 'workout_invite',
                    title: 'Workout Invitation',
                    message: `${user.name} invited you to join their workout!`,
                    data: {
                        sessionId: workoutSession.id,
                        groupId: workoutSession.group_id,
                        gymId: workoutSession.gym_id,
                        gymName: workoutSession.gyms?.name,
                        inviterId: user.id
                    }
                });

            if (notifError) {
                console.error("Notification error:", notifError);
                // Don't fail the whole operation if notification fails
            }

            console.log("Invite sent successfully!");
            return true;
        } catch (err) {
            console.error("inviteToSession failed:", err);
            return false;
        }
    };

    const shareTemplate = async (template, friendId) => {
        if (!user) return false;

        try {
            // 1. Find or Create Chat
            let conversationId = null;
            const { data: existingChats } = await supabase.from('conversation_participants').select('conversation_id, conversations!inner(type)').eq('user_id', user.id);

            if (existingChats) {
                for (const chat of existingChats) {
                    if (chat.conversations.type !== 'private') continue;
                    const { data: members } = await supabase.from('conversation_participants').select('user_id').eq('conversation_id', chat.conversation_id);
                    if (members && members.length === 2 && members.some(m => m.user_id === friendId)) {
                        conversationId = chat.conversation_id;
                        break;
                    }
                }
            }

            if (!conversationId) {
                const { data: newConv } = await supabase.from('conversations').insert({ type: 'private' }).select().single();
                conversationId = newConv.id;
                await supabase.from('conversation_participants').insert([
                    { conversation_id: conversationId, user_id: user.id },
                    { conversation_id: conversationId, user_id: friendId }
                ]);
            }

            // 2. Send Message
            const shareMessage = {
                conversation_id: conversationId,
                sender_id: user.id,
                content: `${user.name} shared a workout routine: ${template.name}`,
                type: 'template_share',
                metadata: {
                    templateId: template.id,
                    name: template.name,
                    exercisesCount: template.exercises?.length || 0,
                    visibility: template.visibility,
                    originalCreatorId: template.user_id
                }
            };

            const { error: msgError } = await supabase.from('messages').insert(shareMessage);
            if (msgError) throw msgError;

            // 3. Notification
            await supabase.from('notifications').insert({
                user_id: friendId,
                type: 'template_share',
                title: 'New Routine Shared',
                message: `${user.name} shared "${template.name}" with you.`,
                data: {
                    templateId: template.id,
                    sharerId: user.id
                }
            });

            return true;
        } catch (err) {
            console.error("shareTemplate failed:", err);
            return false;
        }
    };

    const acceptSharedTemplate = async (templateData, fromName) => {
        if (!user) return false;
        try {
            const { data: original, error } = await supabase
                .from('workout_templates')
                .select('*')
                .eq('id', templateData.templateId)
                .single();

            if (error || !original) {
                alert("Could not find the original template. It might have been deleted/private.");
                return false;
            }

            const newTemplate = {
                name: `From ${fromName || 'Friend'}: ${original.name}`,
                exercises: original.exercises,
                visibility: 'private'
            };

            await addWorkoutTemplate(newTemplate);
            return true;
        } catch (err) {
            console.error("acceptSharedTemplate error:", err);
            return false;
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
            cancelWorkout,
            deleteWorkoutHistory,
            updateWorkoutHistory,
            logSet,
            history,
            workoutTemplates,
            addWorkoutTemplate,
            updateWorkoutTemplate,
            deleteWorkoutTemplate,
            exercises,
            addCustomExercise,
            deleteCustomExercise,
            updateCustomExercise,
            addSetToWorkout,
            removeSetFromWorkout,
            chats,
            getChat,
            fetchFriendWorkouts,
            joinGymCommunity,
            saveUserGym,
            updateUserGym,
            removeUserGym,
            shareTemplate,
            acceptSharedTemplate,
            updateProfileData,
            updatePrivacySettings,
            shareWorkout,
            setDefaultGym,
            getWeeklyStats,
            getPersonalBests,
            getExercisePR,
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
            fetchTemplates, // Expose for Refetch
            workoutSession,
            setWorkoutSession,
            fetchCommunities,
            joinCommunity,
            leaveCommunity,
            getCommunityMembers,
            startTrackingSession,

            stopTrackingSession,
            checkInGym,
            inviteToSession,
            joinSession,
            deleteSession,
            updateSession,
            removeFriend,
            stopTrackingSession,
            checkInGym,
            inviteToSession,
            joinSession,
            deleteSession,
            updateSession,
            removeFriend,
            createManualWorkout,
            updateGym,
            updateGym,
            deleteGlobalGym,
            addExerciseToWorkout,
            removeExerciseFromWorkout
        }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    return useContext(StoreContext);
}
