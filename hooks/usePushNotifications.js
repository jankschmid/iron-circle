"use client";

import { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export function usePushNotifications(user) {
    const [token, setToken] = useState(null);
    const [receivedNotifications, setReceivedNotifications] = useState([]);

    useEffect(() => {
        // Only initialize on native devices since web push requires a different setup
        if (!user || typeof window === 'undefined' || !window.Capacitor || !window.Capacitor.isNativePlatform()) return;

        let isMounted = true;

        const initializePush = async () => {
            try {
                // Request permissions
                const permStatus = await PushNotifications.requestPermissions();

                if (permStatus.receive === 'granted') {
                    // Register with Apple / Google to receive push via APNS/FCM
                    await PushNotifications.register();
                } else {
                    console.warn('Push notification permission denied');
                }
            } catch (error) {
                console.error('Error initializing push notifications:', error);
            }
        };

        const addListeners = async () => {
            await PushNotifications.addListener('registration', async (data) => {
                if (!isMounted) return;
                console.log('Push registration success, token: ' + data.value);
                setToken(data.value);

                // Store token in Supabase
                try {
                    await supabase
                        .from('profiles')
                        .update({ push_token: data.value })
                        .eq('id', user.id);
                } catch (err) {
                    console.error('Failed to update push token in Supabase', err);
                }
            });

            await PushNotifications.addListener('registrationError', (error) => {
                console.error('Push registration error: ', JSON.stringify(error));
            });

            await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('Push received: ', JSON.stringify(notification));
                if (!isMounted) return;
                setReceivedNotifications(prev => [notification, ...prev]);
            });

            await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log('Push action performed: ', JSON.stringify(notification));
            });
        };

        initializePush();
        addListeners();

        return () => {
            isMounted = false;
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                PushNotifications.removeAllListeners();
            }
        };
    }, [user]);

    return { token, notifications: receivedNotifications };
}
