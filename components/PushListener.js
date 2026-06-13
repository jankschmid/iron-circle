"use client";

import { useStore } from '@/lib/store';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * A silent global component that integrates the Capacitor Push Notification logic.
 * It mounts cleanly beneath the PermissionGate.
 */
export default function PushListener() {
    const { user } = useStore();
    
    // Automatically handles token registration on iOS/Android if permissions were granted
    usePushNotifications(user);
    
    return null;
}
