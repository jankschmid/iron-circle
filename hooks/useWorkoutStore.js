"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { EXERCISES } from '@/lib/data';
import { useToast } from '@/components/ToastProvider';
import { calculateSessionXP } from '@/lib/gamification';
import { foregroundService } from '@/lib/foregroundService';

const supabase = createClient();

export function useWorkoutStore(user) {
    const toast = useToast();
    const [activeWorkout, setActiveWorkout] = useState(null);
    const [workoutSummary, setWorkoutSummary] = useState(null);
    const [history, setHistory] = useState([]);
    const [workoutTemplates, setWorkoutTemplates] = useState([]);
    const [workoutPlans, setWorkoutPlans] = useState([]); // Advanced Splits
    const [exercises, setExercises] = useState(EXERCISES);
    const [exerciseError, setExerciseError] = useState(null);
    const [workoutSession, setWorkoutSession] = useState(null); // Gym Check-in

    // --- PERSISTENCE ---
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (activeWorkout) {
            localStorage.setItem('iron-circle-active-workout', JSON.stringify(activeWorkout));
        }
    }, [activeWorkout]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = localStorage.getItem('iron-circle-active-workout');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const valid = parsed.startTime && (new Date() - new Date(parsed.startTime) < 24 * 60 * 60 * 1000);
                if (valid && !activeWorkout) {
                    setActiveWorkout(parsed);

                    // Resume Foreground Service Timer and Completion
                    foregroundService.startTracking('Iron Circle', `Workout Active: ${parsed.name}`, new Date(parsed.startTime).getTime());
                    let tSets = 0, dSets = 0;
                    if (parsed.logs) {
                        parsed.logs.forEach(l => {
                            tSets += l.sets?.length || 0;
                            dSets += l.sets?.filter(s => s.completed)?.length || 0;
                        });
                        foregroundService.setCompletionText(` • ${dSets}/${tSets} Sets`);
                    }

                    toast.success('Session restored from local backup');
                } else if (!valid) {
                    localStorage.removeItem('iron-circle-active-workout');
                }
            } catch (e) {
                localStorage.removeItem('iron-circle-active-workout');
            }
        }
    }, []);

    useEffect(() => {
        if (!user || activeWorkout) return;
        const fetchActiveFromDB = async () => {
            const { data } = await supabase
                .from('workouts')
                .select('*, logs:workout_logs(exercise_id, sets)')
                .eq('user_id', user.id)
                .is('end_time', null)
                .maybeSingle();

            if (data) {
                const restoredLogs = data.logs.map(log => ({
                    exerciseId: log.exercise_id,
                    sets: typeof log.sets === 'string' ? JSON.parse(log.sets) : log.sets
                }));
                const restoredWorkout = {
                    id: data.id,
                    templateId: data.plan_id,
                    name: data.name,
                    startTime: data.start_time,
                    logs: restoredLogs,
                    status: 'active'
                };
                setActiveWorkout(restoredWorkout);

                // Resume Foreground Service Timer and Completion
                foregroundService.startTracking('Iron Circle', `Workout Active: ${restoredWorkout.name}`, new Date(restoredWorkout.startTime).getTime());
                let tSets = 0, dSets = 0;
                restoredLogs.forEach(l => {
                    tSets += l.sets?.length || 0;
                    dSets += l.sets?.filter(s => s.completed)?.length || 0;
                });
                foregroundService.setCompletionText(` • ${dSets}/${tSets} Sets`);
            }
        };
        fetchActiveFromDB();
    }, [user]);

    // --- FETCH DATA ---
    const fetchExercises = async () => {
        const { data, error } = await supabase.from('exercises').select('*').order('name');
        if (data) {
            // Merge defaults with fetched to avoid duplicates if any overlap, but here likely separated
            // or just use data if it contains everything? Assuming EXERCISES is constant fallback.
            setExercises([...EXERCISES, ...data]);
        }
    };

    const fetchCustomExercises = async () => {
        if (!user) return;
        const { data } = await supabase.from('custom_exercises').select('*').eq('user_id', user.id);
        if (data) {
            setExercises(prev => [...EXERCISES, ...data]);
        }
    };

    // Auto-fetch custom exercises on user load
    useEffect(() => {
        if (user) fetchCustomExercises();
    }, [user]);

    const fetchHistory = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('workouts')
            .select(`
                id, name, start_time, end_time, volume, duration, visibility,
                logs:workout_logs ( exercise_id, sets )
            `)
            .eq('user_id', user.id)
            .not('end_time', 'is', null)
            .order('end_time', { ascending: false });

        if (data) {
            const formatted = data.map(w => ({
                id: w.id,
                name: w.name,
                startTime: w.start_time,
                endTime: w.end_time,
                volume: w.volume,
                duration: w.duration,
                status: w.status,
                visibility: w.visibility,
                logs: w.logs.map(l => ({
                    exerciseId: l.exercise_id,
                    sets: typeof l.sets === 'string' ? JSON.parse(l.sets) : l.sets
                }))
            }));
            setHistory(formatted);
        }
    };

    const fetchTemplates = async () => {
        if (!user) return;
        const { data } = await supabase.from('workout_templates').select('*').eq('user_id', user.id).order('created_at');
        if (data) setWorkoutTemplates(data);
    };

    useEffect(() => {
        if (user) fetchTemplates();
    }, [user]);

    // --- TRACKING SESSIONS ---
    const startTrackingSession = async (gymId, type = 'manual', gymName = null) => {
        if (!user) return alert("Please sign in.");
        if (!gymId) return toast.error("Error: No Gym ID.");

        const { data: session, error } = await supabase
            .from('workout_sessions')
            .insert({
                user_id: user.id,
                gym_id: gymId,
                start_time: new Date().toISOString(),
                status: 'active',
                type,
                is_private: user.privacy_settings?.live_status === false
            })
            .select('*, gyms(name)')
            .single();

        if (error) {
            console.error("Start Session Error:", error);
            return;
        }
        setWorkoutSession(session);

        // Start Foreground Service Notification for Gym Session
        const displayGymName = session?.gyms?.name || gymName || 'a Gym';
        foregroundService.startTracking(
            'Iron Circle',
            `Checked into ${displayGymName}`,
            new Date(session.start_time).getTime()
        );
    };

    const stopTrackingSession = async (reason = 'manual') => {
        if (!workoutSession) return;

        // If manually stopped while auto-tracking is enabled (or even generally), suppress immediate restart for this gym
        if (reason === 'manual' && workoutSession.gym_id) {
            sessionStorage.setItem('suppressedGymId', workoutSession.gym_id);
            console.log('[WorkoutStore] Manually stopped. Suppressing auto-start for gym:', workoutSession.gym_id);
        }

        const endTime = new Date().toISOString();
        const duration = Math.round((new Date(endTime) - new Date(workoutSession.start_time)) / 1000);

        let status = 'completed';
        if (reason.includes('timeout')) status = 'timeout';

        await supabase.from('workout_sessions')
            .update({ end_time: endTime, duration, status })
            .eq('id', workoutSession.id);

        setWorkoutSession(null);

        // End Foreground Notification if it wasn't a workout
        foregroundService.stop();
    };

    // --- WORKOUT ACTIONS ---
    const startWorkout = async (templateId, planId = null, dayId = null) => {
        if (!user) return alert("Please sign in.");
        let initialLogs = [];
        let name = "New Workout";

        const template = workoutTemplates.find(t => t.id === templateId);
        if (template) {
            name = template.name;
            if (template.exercises) {
                // Map template exercises to logs
                initialLogs = template.exercises.map(ex => ({
                    exerciseId: ex.id,
                    sets: ex.sets || [{ weight: 0, reps: '', completed: false }]
                }));
            }
        }

        const newWorkout = {
            id: crypto.randomUUID(),
            userId: user.id,
            name,
            startTime: new Date().toISOString(),
            logs: initialLogs,
            status: 'active',
            planId,
            planId,
            dayId,
            templateId
        };
        setActiveWorkout(newWorkout);

        // Start Android Foreground Service
        foregroundService.startTracking(
            'Iron Circle',
            `Workout Active: ${name}`,
            new Date(newWorkout.startTime).getTime()
        );
    };

    const logSet = (exerciseId, setIndex, data) => {
        if (!activeWorkout) return;
        const updatedLogs = activeWorkout.logs.map(log => {
            if (log.exerciseId === exerciseId) {
                const newSets = [...log.sets];
                const now = Date.now();
                newSets[setIndex] = {
                    ...newSets[setIndex],
                    ...data,
                    completedAt: data.completed ? now : null
                };
                return { ...log, sets: newSets };
            }
            return log;
        });
        const newState = { ...activeWorkout, logs: updatedLogs, lastActionTime: Date.now() };

        // Update Foreground Service Progress (e.g. 5/10 Sets)
        let totalSets = 0;
        let doneSets = 0;
        newState.logs.forEach(l => {
            totalSets += l.sets.length;
            doneSets += l.sets.filter(s => s.completed).length;
        });
        foregroundService.setCompletionText(` • ${doneSets}/${totalSets} Sets`);

        setActiveWorkout(newState);
    };

    const addSetToWorkout = (exerciseId) => {
        if (!activeWorkout) return;
        const updatedLogs = activeWorkout.logs.map(log => {
            if (log.exerciseId === exerciseId) {
                const lastSet = log.sets[log.sets.length - 1];
                return {
                    ...log,
                    sets: [...log.sets, {
                        weight: lastSet ? lastSet.weight : 0,
                        reps: lastSet ? lastSet.reps : '',
                        completed: false
                    }]
                };
            }
            return log;
        });
        setActiveWorkout({ ...activeWorkout, logs: updatedLogs });
    };

    const removeSetFromWorkout = (exerciseId, setIndex) => {
        if (!activeWorkout) return;
        const updatedLogs = activeWorkout.logs.map(log => {
            if (log.exerciseId === exerciseId && log.sets.length > 1) {
                return { ...log, sets: log.sets.filter((_, i) => i !== setIndex) };
            }
            return log;
        });
        setActiveWorkout({ ...activeWorkout, logs: updatedLogs });
    };

    const addExerciseToWorkout = (exerciseId) => {
        if (!activeWorkout) return;
        if (activeWorkout.logs.find(l => l.exerciseId === exerciseId)) return alert("Exercise already in workout.");
        setActiveWorkout(prev => ({
            ...prev,
            logs: [...prev.logs, {
                exerciseId,
                sets: [{ weight: 0, reps: '', completed: false }]
            }]
        }));
    };

    const removeExerciseFromWorkout = (exerciseId) => {
        if (!activeWorkout) return;
        setActiveWorkout(prev => ({
            ...prev,
            logs: prev.logs.filter(l => l.exerciseId !== exerciseId)
        }));
    };

    const finishWorkout = async ({ visibility = 'public' } = {}) => {
        if (!activeWorkout || !user) return;
        if (workoutSession) await stopTrackingSession();

        // Stop Android Foreground Service
        foregroundService.stop();

        const endTime = new Date();
        const duration = Math.round((endTime - new Date(activeWorkout.startTime)) / 1000);

        let totalDistance = 0;
        let totalVol = 0;
        activeWorkout.logs.forEach(l => {
            const ex = exercises.find(e => e.id === l.exerciseId);
            if (ex && ex.type === 'cardio') {
                l.sets.forEach(s => { if (s.completed) totalDistance += Number(s.weight || 0); });
            }
            l.sets.forEach(s => {
                if (s.completed) totalVol += (Number(s.weight) * Number(s.reps));
            });
        });

        const xpResult = calculateSessionXP({ duration, volume: totalVol, prs: 0, streak: 1, distance: totalDistance }, { volume: 1 });

        const summaryData = {
            earnedXP: xpResult.total,
            newTotalXP: (user.current_xp || 0) + xpResult.total,
            duration,
            volume: totalVol,
            name: activeWorkout.name,
            breakdown: xpResult.breakdown,
            analysis: {
                volumeDelta: 0, // Placeholder for now, could act calc later
                newRecords: [] // Placeholder
            }
        };

        try {
            const { data: inserted, error } = await supabase.from('workouts').insert({
                user_id: user.id,
                name: activeWorkout.name,
                start_time: activeWorkout.startTime,
                end_time: endTime.toISOString(),
                duration,
                volume: totalVol,
                distance: totalDistance,
                visibility,
                plan_id: activeWorkout.planId,
                plan_day_id: activeWorkout.dayId
            }).select().single();

            if (error) throw error;

            const logsPayload = activeWorkout.logs.map(l => ({
                workout_id: inserted.id,
                exercise_id: l.exerciseId,
                sets: JSON.stringify(l.sets)
            }));
            await supabase.from('workout_logs').insert(logsPayload);

            // --- PHASE 4: SOCIAL TRIGGERS ---
            // 1. Post to Feed
            await supabase.from('feed_events').insert({
                user_id: user.id,
                type: 'workout',
                data: summaryData
            });

            // 2. Check & Update Community Goals
            const { data: myCommunities } = await supabase.from('community_members').select('community_id').eq('user_id', user.id);
            if (myCommunities && myCommunities.length > 0) {
                const communityIds = myCommunities.map(c => c.community_id);
                const { data: activeGoals } = await supabase.from('community_goals')
                    .select('*')
                    .in('community_id', communityIds)
                    .eq('status', 'ACTIVE');

                if (activeGoals && activeGoals.length > 0) {
                    // Calculate totals
                    let totalDistance = 0;
                    activeWorkout.logs.forEach(l => {
                        const ex = exercises.find(e => e.id === l.exerciseId);
                        if (ex && ex.type === 'cardio') {
                            // For cardio: Weight = Distance (meters), Reps = Time (min) - convention
                            l.sets.forEach(s => { if (s.completed) totalDistance += Number(s.weight || 0); });
                        }
                    });

                    for (const goal of activeGoals) {
                        let contribution = 0;
                        if (goal.metric === 'VOLUME') contribution = totalVol;
                        else if (goal.metric === 'WORKOUTS') contribution = 1;
                        else if (goal.metric === 'DISTANCE') contribution = totalDistance;

                        if (contribution > 0) {
                            await supabase.rpc('contribute_to_goal', {
                                p_goal_id: goal.id,
                                p_amount: contribution
                            });
                        }
                    }
                }
            }
            // --------------------------------

            // --- PHASE 5: OPERATIONS / MISSIONS ---
            try {
                const { data: opResult, error: opError } = await supabase.rpc('check_operations_progress', {
                    p_workout_id: inserted.id
                });
                if (opError) {
                    console.error("Failed to check operations:", opError);
                } else {
                    console.log("Operations Check:", opResult);
                }
            } catch (err) {
                console.error("Operations exception:", err);
            }

            setWorkoutSummary(summaryData);
            setActiveWorkout(null);
            localStorage.removeItem('iron-circle-active-workout');
            fetchHistory();
            return { success: true, summary: summaryData };

        } catch (e) {
            console.error("Finish failed:", e);
            toast.error("Failed to save workout");
            return { success: false };
        }
    };

    const cancelWorkout = async () => {
        if (!activeWorkout) return;

        // Stop Android Foreground Service
        foregroundService.stop();

        localStorage.removeItem('iron-circle-active-workout');
        setActiveWorkout(null);
        if (activeWorkout.id) await supabase.from('workouts').delete().eq('id', activeWorkout.id);
    };

    // --- PLANS ---
    const fetchPlans = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('workout_plans')
            .select(`*, days:workout_plan_days (id, day_order, label, template_id, template:workout_templates (id, name, exercises))`)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            const sorted = data.map(p => ({
                ...p,
                days: (p.days || []).sort((a, b) => a.day_order - b.day_order)
            }));
            setWorkoutPlans(sorted);
        }
    };

    useEffect(() => {
        if (user) fetchPlans();
    }, [user]);

    const savePlan = async (planData, days) => {
        try {
            let planId = planData.id;
            const pl = {
                user_id: user.id,
                name: planData.name,
                description: planData.description,
                is_active: planData.is_active || false,
                type: planData.type || 'scheduled'
            };
            if (planId) pl.id = planId;

            const { data: savedPlan, error } = await supabase.from('workout_plans').upsert(pl).select().single();
            if (error) throw error;
            planId = savedPlan.id;

            if (planData.id) await supabase.from('workout_plan_days').delete().eq('plan_id', planId);

            const daysToInsert = days.map((d, idx) => ({
                plan_id: planId,
                template_id: d.template_id,
                day_order: idx + 1,
                label: d.label || `Day ${idx + 1}`
            }));

            if (daysToInsert.length > 0) await supabase.from('workout_plan_days').insert(daysToInsert);
            await fetchPlans();
            return planId;
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const deletePlan = async (planId) => {
        const { error } = await supabase.from('workout_plans').delete().eq('id', planId);
        if (!error) setWorkoutPlans(prev => prev.filter(p => p.id !== planId));
    };

    const activatePlan = async (planId) => {
        // Optimistic
        setWorkoutPlans(prev => prev.map(p => ({ ...p, is_active: p.id === planId })));
        await supabase.from('workout_plans').update({ is_active: false }).eq('user_id', user.id);
        await supabase.from('workout_plans').update({ is_active: true }).eq('id', planId);
        fetchPlans();
    };

    // --- TEMPLATES & CUSTOM EXERCISES ---
    const addWorkoutTemplate = async (template) => {
        const { data, error } = await supabase.from('workout_templates').insert({
            user_id: user.id,
            name: template.name,
            visibility: template.visibility || 'public',
            exercises: template.exercises
        }).select().single();
        if (!error && data) setWorkoutTemplates(prev => [...prev, data]);
        return data;
    };

    const updateWorkoutTemplate = async (id, updates) => {
        const { error } = await supabase.from('workout_templates').update(updates).eq('id', id);
        if (!error) setWorkoutTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const deleteWorkoutTemplate = async (id) => {
        const { error } = await supabase.from('workout_templates').delete().eq('id', id);
        if (!error) setWorkoutTemplates(prev => prev.filter(t => t.id !== id));
    };

    const addCustomExercise = async (name, muscle = 'Other') => {
        const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
        const { error } = await supabase.from('custom_exercises').insert({ id, user_id: user.id, name, muscle });
        if (!error) setExercises(prev => [...prev, { id, name, muscle, isCustom: true }]);
    };

    const updateCustomExercise = async (id, name, muscle) => {
        const { error } = await supabase.from('custom_exercises').update({ name, muscle }).eq('id', id);
        if (!error) setExercises(prev => prev.map(e => e.id === id ? { ...e, name, muscle } : e));
    };

    const deleteCustomExercise = async (id) => {
        const { error } = await supabase.from('custom_exercises').delete().eq('id', id);
        if (!error) setExercises(prev => prev.filter(e => e.id !== id));
    };

    // --- STATS & UTILS ---
    const getWeeklyStats = () => {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Mon
        startOfWeek.setHours(0, 0, 0, 0);

        const volumeByDay = [0, 0, 0, 0, 0, 0, 0];
        let weeklyVolume = 0;
        let weeklyWorkouts = 0;
        let weeklyTime = 0;

        if (!history) return { volumeByDay, totalWorkouts: 0, totalVolume: 0, weeklyVolume: 0, weeklyWorkouts: 0, weeklyTime: 0, streak: 0 };

        const uniqueDays = new Set();
        history.forEach(session => {
            const date = new Date(session.endTime);
            const dateStr = date.toISOString().split('T')[0];
            uniqueDays.add(dateStr);

            if (date >= startOfWeek) {
                let sessionVolume = session.volume || 0;
                // If volume not calc/stored, fallback to logs
                if (!sessionVolume && session.logs) {
                    session.logs.forEach(l => Array.isArray(l.sets) && l.sets.forEach(s => { if (s.completed) sessionVolume += (s.weight || 0) * (s.reps || 0) }));
                }

                let dayIndex = date.getDay() - 1;
                if (dayIndex === -1) dayIndex = 6;
                if (dayIndex >= 0 && dayIndex < 7) volumeByDay[dayIndex] += sessionVolume;

                weeklyVolume += sessionVolume;
                weeklyWorkouts++;
                weeklyTime += (session.duration || 0);
            }
        });

        // Streak
        const sortedDays = [...uniqueDays].sort().reverse();
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (sortedDays.includes(today) || sortedDays.includes(yesterday)) {
            streak = 1;
            let checkDate = new Date(sortedDays.includes(today) ? today : yesterday);
            for (let i = 1; i < sortedDays.length; i++) {
                checkDate.setDate(checkDate.getDate() - 1);
                if (sortedDays.includes(checkDate.toISOString().split('T')[0])) streak++;
                else break;
            }
        }

        const totalWorkouts = history.length;
        const totalVolume = history.reduce((acc, s) => acc + (s.volume || 0), 0);

        return { volumeByDay, totalWorkouts, totalVolume, weeklyVolume, weeklyWorkouts, weeklyTime, streak };
    };

    const getMonthlyStats = () => {
        if (!history) return { weeklyVolume: [], muscleSplit: [] };
        const now = new Date();
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(now.getDate() - 28);
        const weeklyVolume = [0, 0, 0, 0];
        const muscleSplit = {};

        history.forEach(session => {
            const date = new Date(session.endTime);
            if (date >= fourWeeksAgo) {
                const diffDays = Math.ceil(Math.abs(now - date) / (1000 * 60 * 60 * 24));
                const weekIndex = 3 - Math.floor((diffDays - 1) / 7);

                let vol = session.volume || 0;
                if (!vol && session.logs) {
                    session.logs.forEach(l => {
                        if (!Array.isArray(l.sets)) return;
                        let exVol = 0;
                        l.sets.forEach(s => { if (s.completed) exVol += (s.weight || 0) * (s.reps || 0) });
                        vol += exVol;

                        // Muscle Split
                        const muscle = EXERCISES.find(e => e.id === l.exerciseId)?.muscle || 'Other';
                        muscleSplit[muscle] = (muscleSplit[muscle] || 0) + (l.sets.filter(s => s.completed).length);
                    });
                }
                if (weekIndex >= 0 && weekIndex <= 3) weeklyVolume[weekIndex] += vol;
            }
        });

        const splitArray = Object.entries(muscleSplit).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        return { weeklyVolume, muscleSplit: splitArray };
    };

    const getPersonalBests = () => {
        const bests = {};
        if (!history) return [];
        history.forEach(session => {
            if (session.logs) session.logs.forEach(log => {
                const ex = exercises.find(e => e.id === log.exerciseId);
                if (ex && Array.isArray(log.sets)) {
                    log.sets.forEach(set => {
                        if (set.completed && (!bests[ex.name] || set.weight > bests[ex.name].weight)) {
                            bests[ex.name] = { weight: set.weight, date: session.endTime.split('T')[0] };
                        }
                    });
                }
            });
        });
        return Object.entries(bests).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.weight - a.weight).slice(0, 4);
    };

    const getExercisePR = (exerciseId) => {
        let maxWeight = 0;
        if (history) history.forEach(s => s.logs?.forEach(l => {
            if (l.exerciseId === exerciseId) l.sets.forEach(set => {
                if (set.completed && set.weight > maxWeight) maxWeight = set.weight;
            });
        }));
        return maxWeight > 0 ? maxWeight : null;
    };

    const getExerciseHistory = (exerciseId) => {
        if (!history) return null;
        const lastSession = history.find(s => s.logs?.some(l => l.exerciseId === exerciseId));
        if (!lastSession) return null;
        const log = lastSession.logs.find(l => l.exerciseId === exerciseId);
        return log ? log.sets : null;
    };

    const convertWeight = (w, unit) => {
        if (!w) return 0;
        return unit === 'lbs' ? Math.round(w * 2.20462) : Math.round(w);
    };

    return {
        activeWorkout,
        setActiveWorkout,
        workoutSummary,
        setWorkoutSummary,
        history,
        exercises,
        workoutTemplates,
        setWorkoutTemplates,
        workoutSession,
        setWorkoutSession,

        fetchExercises,
        fetchCustomExercises,
        fetchHistory,
        fetchTemplates,

        startWorkout,
        logSet,
        addSetToWorkout,
        removeSetFromWorkout,
        addExerciseToWorkout,
        removeExerciseFromWorkout,
        finishWorkout,
        cancelWorkout,
        clearWorkoutSummary: () => setWorkoutSummary(null),

        createManualWorkout: async ({ name, date, duration, volume, logs = [] }) => {
            if (!user) return false;
            try {
                const start = new Date(date);
                const { data: w, error } = await supabase.from('workouts').insert({
                    user_id: user.id, name, start_time: start.toISOString(), end_time: new Date(start.getTime() + duration * 1000).toISOString(), duration, volume
                }).select().single();
                if (error) throw error;
                if (logs.length > 0) {
                    await supabase.from('workout_logs').insert(logs.map(l => ({ workout_id: w.id, exercise_id: l.exerciseId, sets: JSON.stringify(l.sets) })));
                }

                // Increase user XP/Stats for manual addition
                const xpResult = calculateSessionXP({ duration, volume, prs: 0, streak: 1, distance: 0 }, { volume: 1 });
                if (xpResult.total > 0) {
                    await supabase.rpc('increment_user_xp', { amount: xpResult.total });
                }

                fetchHistory();
                return true;
            } catch (e) { console.error(e); return false; }
        },
        deleteWorkoutHistory: async (id) => {
            const workoutToDelete = history.find(w => w.id === id);
            setHistory(prev => prev.filter(w => w.id !== id));

            // Delete from Database & Deduct XP safely via RPC
            const { error, data } = await supabase.rpc('delete_workout_data', { p_workout_id: id });

            if (error) {
                console.error("Error wiping workout data", error);
                // Revert optimistic delete if it fails
                fetchHistory();
            } else if (data && !data.success) {
                console.error("Wipe failed:", data.message);
                fetchHistory();
            }
        },
        updateWorkoutHistory: async (id, data) => { }, // Stub

        startTrackingSession,
        stopTrackingSession,
        checkInGym: startTrackingSession, // Wrapper Alias

        addWorkoutTemplate,
        updateWorkoutTemplate,
        deleteWorkoutTemplate,
        addCustomExercise,
        updateCustomExercise,
        deleteCustomExercise,

        workoutPlans,
        fetchPlans,
        savePlan,
        deletePlan,
        activatePlan,

        getWeeklyStats,
        getMonthlyStats,
        getPersonalBests,
        getExercisePR,
        getExerciseHistory,
        convertWeight
    };
}
