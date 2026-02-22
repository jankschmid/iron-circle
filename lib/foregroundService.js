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
        this.intervalId = null;
        this.startTime = null;
        this.baseTitle = 'Iron Circle';
        this.baseText = '';
        this.completionText = '';
    }

    /** Helper to format milliseconds to HH:MM or MM */
    _formatTime(ms) {
        if (!ms || ms < 0) return '0m';
        const totalMin = Math.floor(ms / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    /**
     * Starts a dynamic tracking session that ticks every second.
     */
    async startTracking(title, textPrefix, startTimeMs) {
        if (!this.isSupported) return;
        this.startTime = startTimeMs || Date.now();
        this.baseTitle = title;
        this.baseText = textPrefix;
        this.completionText = '';

        try {
            const permStatus = await ForegroundService.checkPermissions();
            if (permStatus.display !== 'granted') {
                const requested = await ForegroundService.requestPermissions();
                if (requested.display !== 'granted') return;
            }

            await ForegroundService.startForegroundService({
                id: 1001,
                title: this.baseTitle,
                body: `${this.baseText} - 0m`,
                smallIcon: 'ic_stat_onesignal_default',
                silent: true // Prevents sounds & vibrations on continuous updates
            });
            this.isActive = true;

            if (this.intervalId) clearInterval(this.intervalId);

            this.intervalId = setInterval(() => {
                if (!this.isActive) return clearInterval(this.intervalId);
                const elapsed = Date.now() - this.startTime;
                const timeStr = this._formatTime(elapsed);

                ForegroundService.updateForegroundService({
                    id: 1001,
                    title: this.baseTitle,
                    body: `${this.baseText} - ${timeStr}${this.completionText}`,
                    smallIcon: 'ic_stat_onesignal_default'
                }).catch(e => console.error('Silent update error:', e));
            }, 60000); // 1 minute interval to prevent spam

        } catch (error) {
            console.error('Failed to start foreground service:', error);
        }
    }

    /** Appends extra info like " • 5/10 Sets" to the ticking timer */
    setCompletionText(text) {
        this.completionText = text;
    }

    /**
     * Starts the foreground service notification.
     * @param {string} title 
     * @param {string} text 
     */
    async start(title = 'Iron Circle', text = 'Tracking Active Session') {
        if (!this.isSupported) return;

        try {
            // Android 13+ requires explicit runtime permission for notifications
            const permStatus = await ForegroundService.checkPermissions();
            if (permStatus.display !== 'granted') {
                const requested = await ForegroundService.requestPermissions();
                if (requested.display !== 'granted') {
                    console.warn('Foreground service requires notification permissions to display.');
                    // Some plugins allow starting silently without notifications, but CapAwesome requires it
                    // Returning gracefully.
                    return;
                }
            }

            await ForegroundService.startForegroundService({
                id: 1001,
                title: title,
                body: text,
                smallIcon: 'ic_stat_onesignal_default' // Clean vector drawable
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

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

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
