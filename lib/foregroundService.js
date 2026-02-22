import { Capacitor, registerPlugin } from '@capacitor/core';

// Connects to @CapacitorPlugin(name = "IronCircleForeground") in MainActivity.java
const NativeForeground = registerPlugin('IronCircleForeground');

/**
 * Iron Circle Native Foreground Service Manager
 *
 * Provides two distinct notification states:
 *  - startWorkoutTracking() → Active Workout with native progress bar
 *  - startGymTracking()     → Background gym check-in without progress bar
 */
class ForegroundServiceManager {
    constructor() {
        this.isActive = false;
        this.isSupported = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
        this.intervalId = null;
        this.startTime = null;

        // Current notification state
        this._title = '';
        this._subtitle = '';
        this._showProgress = false;
        this._doneSets = 0;
        this._totalSets = 0;
    }

    _formatTime(ms) {
        if (!ms || ms < 0) return '0m';
        const totalMin = Math.floor(ms / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    _progress() {
        if (this._totalSets <= 0) return 0;
        return Math.round((this._doneSets / this._totalSets) * 100);
    }

    async _pushStart() {
        const elapsed = this.startTime ? Date.now() - this.startTime : 0;
        await NativeForeground.start({
            title: this._title,
            subtitle: this._subtitle,
            timer: this._formatTime(elapsed),
            showProgress: this._showProgress,
            progress: this._progress(),
            maxProgress: 100,
        });
    }

    async _pushUpdate() {
        const elapsed = this.startTime ? Date.now() - this.startTime : 0;
        await NativeForeground.update({
            title: this._title,
            subtitle: this._subtitle,
            timer: this._formatTime(elapsed),
            showProgress: this._showProgress,
            progress: this._progress(),
            maxProgress: 100,
        });
    }

    _startInterval() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
            if (!this.isActive) { clearInterval(this.intervalId); return; }
            this._pushUpdate().catch(e =>
                console.warn('[IronCircle] Silent update error:', e?.message)
            );
        }, 60000); // tick every minute to update timer display
    }

    /**
     * STATE A — Active Workout
     * Shows title, "exerciseName • Set x/y", a native progress bar, and live timer.
     */
    async startWorkoutTracking({ title = 'Iron Circle', workoutName, doneSets = 0, totalSets = 0, startTimeMs }) {
        if (!this.isSupported) return;

        this.startTime = startTimeMs || Date.now();
        this._title = title;
        this._subtitle = workoutName || 'Workout Active';
        this._showProgress = true;
        this._doneSets = doneSets;
        this._totalSets = totalSets;

        try {
            console.log('[IronCircle] Starting workout tracking:', this._subtitle);
            await this._pushStart();
            this.isActive = true;
            this._startInterval();
            console.log('[IronCircle] ✅ Workout foreground service active');
        } catch (e) {
            console.error('[IronCircle] ❌ Failed to start workout service:', e?.message || JSON.stringify(e));
        }
    }

    /**
     * STATE B — Gym Check-in (no progress bar)
     * Shows "Gym Session Active" title, gym name as subtitle, elapsed timer.
     */
    async startGymTracking({ gymName, startTimeMs }) {
        if (!this.isSupported) return;

        this.startTime = startTimeMs || Date.now();
        this._title = 'Gym Session Active';
        this._subtitle = gymName ? `Checked in at ${gymName}` : 'Tracking your gym session';
        this._showProgress = false;
        this._doneSets = 0;
        this._totalSets = 0;

        try {
            console.log('[IronCircle] Starting gym tracking:', gymName);
            await this._pushStart();
            this.isActive = true;
            this._startInterval();
            console.log('[IronCircle] ✅ Gym check-in foreground service active');
        } catch (e) {
            console.error('[IronCircle] ❌ Failed to start gym service:', e?.message || JSON.stringify(e));
        }
    }

    /**
     * Update the workout progress in real-time (called on each set completion).
     * Also updates the subtitle to reflect the current exercise.
     */
    async setWorkoutProgress({ doneSets, totalSets, exerciseName }) {
        if (!this.isActive || !this.isSupported) return;
        this._doneSets = doneSets ?? this._doneSets;
        this._totalSets = totalSets ?? this._totalSets;
        if (exerciseName) {
            this._subtitle = exerciseName;
        }
        await this._pushUpdate().catch(e =>
            console.warn('[IronCircle] Progress update error:', e?.message)
        );
    }

    /**
     * Stops the foreground service and removes the notification.
     */
    async stop() {
        if (!this.isSupported || !this.isActive) return;

        if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }

        try {
            await NativeForeground.stop({});
            this.isActive = false;
            console.log('[IronCircle] Native foreground service stopped');
        } catch (e) {
            console.error('[IronCircle] Failed to stop service:', e?.message);
        }
    }
}

export const foregroundService = new ForegroundServiceManager();
