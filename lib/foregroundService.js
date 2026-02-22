import { Capacitor } from '@capacitor/core';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

/**
 * Helper utility to manage the Android Foreground Notification Service.
 * This is essential to prevent the app from being killed by the OS while a workout
 * or gym session is actively being tracked in the background.
 */
class ForegroundServiceManager {
    constructor() {
        this.isActive = false;
        this.isSupported = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    }

    /**
     * Starts the foreground service notification.
     * @param {string} title 
     * @param {string} text 
     */
    async start(title = 'Iron Circle', text = 'Tracking Active Session') {
        if (!this.isSupported) return;

        try {
            await ForegroundService.startForegroundService({
                id: 1001,
                title: title,
                body: text,
                smallIcon: 'ic_launcher_background' // Valid Android drawable
            });
            this.isActive = true;
            console.log('Foreground service started');
        } catch (error) {
            console.error('Failed to start foreground service:', error);
        }
    }

    /**
     * Updates the existing notification text (e.g. for a live timer).
     * @param {string} title 
     * @param {string} text 
     */
    async update(title, text) {
        if (!this.isActive || !this.isSupported) return;

        try {
            await ForegroundService.updateForegroundService({
                id: 1001,
                title: title,
                body: text
            });
        } catch (error) {
            console.error('Failed to update foreground service:', error);
        }
    }

    /**
     * Stops the foreground service notification.
     */
    async stop() {
        if (!this.isSupported || !this.isActive) return;

        try {
            await ForegroundService.stopForegroundService();
            this.isActive = false;
            console.log('Foreground service stopped');
        } catch (error) {
            console.error('Failed to stop foreground service:', error);
        }
    }
}

// Export a singleton instance
export const foregroundService = new ForegroundServiceManager();
