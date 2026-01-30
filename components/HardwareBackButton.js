"use client";

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useRouter, usePathname } from 'next/navigation';

export default function HardwareBackButton() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const handleBackButton = async ({ canGoBack }) => {
            // Paths where back button should exit the app
            const exitPaths = ['/', '/login', '/signup'];

            if (exitPaths.includes(pathname)) {
                App.exitApp();
            } else {
                // Determine if we should really go back or if it's a modal state
                // For now, simple history back
                router.back();
            }
        };

        const listener = App.addListener('backButton', handleBackButton);

        return () => {
            listener.then(handler => handler.remove());
        };
    }, [pathname, router]);

    return null;
}
