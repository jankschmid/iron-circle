// lib/store.js
"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { CURRENT_USER, FRIENDS, WORKOUT_TEMPLATES, EXERCISES } from './data';

const StoreContext = createContext();

export function StoreProvider({ children }) {
    const [user, setUser] = useState({ ...CURRENT_USER, units: 'kg', gymId: 'iron-paradise' }); // Default gym
    const [friends, setFriends] = useState(FRIENDS);
    const [activeWorkout, setActiveWorkout] = useState(null);
    const [history, setHistory] = useState([]);
    const [workoutTemplates, setWorkoutTemplates] = useState(WORKOUT_TEMPLATES);
    const [exercises, setExercises] = useState(EXERCISES);
    const [chats, setChats] = useState([
        { id: 'gym-group', name: 'Iron Paradise Community', type: 'group', messages: [] },
    ]);

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
    const finishWorkout = () => {
        if (!activeWorkout) return;

        const completedSession = { ...activeWorkout, endTime: new Date().toISOString() };
        setHistory(prev => [completedSession, ...prev]);
        setActiveWorkout(null);

        // Check for PRs (Simulated simpler logic here, detailed check in Logger)
        // Update total volume stats etc.
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
        setUser(prev => ({ ...prev, ...updates }));
    };

    // Calculate Weekly Volume & Stats
    const getWeeklyStats = () => {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday
        startOfWeek.setHours(0, 0, 0, 0);

        const volumeByDay = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun

        history.forEach(session => {
            const date = new Date(session.endTime);
            // Only count if in current week (simplified)
            // Ideally check if > startOfWeek

            // Calculate session volume
            let sessionVolume = 0;
            session.logs.forEach(log => {
                log.sets.forEach(set => {
                    if (set.completed) sessionVolume += (set.weight || 0) * (set.reps || 0);
                });
            });

            // Map to day index (0=Mon, 6=Sun)
            let dayIndex = date.getDay() - 1;
            if (dayIndex === -1) dayIndex = 6; // Sunday

            volumeByDay[dayIndex] += sessionVolume;
        });

        // Total Stats
        const totalWorkouts = history.length;
        const totalVolume = history.reduce((acc, session) => {
            let sessionVol = 0;
            session.logs.forEach(log => {
                log.sets.forEach(set => {
                    if (set.completed) sessionVol += (set.weight || 0) * (set.reps || 0);
                });
            });
            return acc + sessionVol;
        }, 0);

        return { volumeByDay, totalWorkouts, totalVolume };
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
