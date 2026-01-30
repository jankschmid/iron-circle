import { Preferences } from '@capacitor/preferences';

export const PreferenceUtils = {
    async set(key, value) {
        await Preferences.set({
            key,
            value: JSON.stringify(value),
        });
    },

    async get(key) {
        const { value } = await Preferences.get({ key });
        try {
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.error(`Error parsing preference key "${key}":`, e);
            return null;
        }
    },

    async remove(key) {
        await Preferences.remove({ key });
    },

    async clear() {
        await Preferences.clear();
    }
};

export const KEYS = {
    USER_SESSION: 'user_session_v1',
    THEME_MODE: 'theme_mode',
    ACTIVE_WORKOUT: 'active_workout_backup',
};
