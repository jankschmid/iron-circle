"use client";

import { createClient } from '@/lib/supabase';
import { createContext, useContext, useEffect } from 'react';
import { useUserStore } from '@/hooks/useUserStore';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { useSocialStore } from '@/hooks/useSocialStore';
import { useNotifications } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const StoreContext = createContext();

export function StoreProvider({ children }) {
    // 1. Initialize Domain Stores
    const userStore = useUserStore();
    const workoutStore = useWorkoutStore(userStore.user);
    // Pass workoutSession to Social Store for invites
    const socialStore = useSocialStore(userStore.user, workoutStore.workoutSession);
    const notificationStore = useNotifications(userStore.user);
    const pushStore = usePushNotifications(userStore.user);

    // 2. Cross-Store Orchestration
    useEffect(() => {
        if (userStore.user) {
            console.log("Store Orchestrator: User detected, hydrating data...");
            workoutStore.fetchExercises();
            workoutStore.fetchHistory();
            socialStore.fetchFriends();
            // notificationStore.fetchNotifications(); // Auto-fetched in hook
        }
    }, [userStore.user?.id]);

    // 3. Flatten for Context (Backward Compatibility)
    // Note: unreadCount in socialStore might conflict with unreadCount in notificationStore
    // We'll rename notificationStore.unreadCount to systemUnreadCount
    const value = {
        ...userStore,
        ...workoutStore,
        ...socialStore,
        ...notificationStore,
        systemUnreadCount: notificationStore.unreadCount, // Explicit rename to avoid conflict
        unreadCount: socialStore.unreadCount // Keep social unread count priority if same name
    };

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    return useContext(StoreContext);
}
