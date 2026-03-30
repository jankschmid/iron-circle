import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Universal Storage Wrapper
 * Uses @capacitor/preferences on Native devices for rock-solid persistence.
 * Falls back to localStorage on the Web.
 */
export const Storage = {
    async get(key) {
        if (Capacitor.isNativePlatform()) {
            const { value } = await Preferences.get({ key });
            return value;
        } else {
            if (typeof window === 'undefined') return null;
            return localStorage.getItem(key);
        }
    },

    async set(key, value) {
        if (Capacitor.isNativePlatform()) {
            await Preferences.set({ key, value: String(value) });
        } else {
            if (typeof window !== 'undefined') localStorage.setItem(key, String(value));
        }
    },

    async remove(key) {
        if (Capacitor.isNativePlatform()) {
            await Preferences.remove({ key });
        } else {
            if (typeof window !== 'undefined') localStorage.removeItem(key);
        }
    },

    async clear() {
        if (Capacitor.isNativePlatform()) {
            await Preferences.clear();
        } else {
            if (typeof window !== 'undefined') localStorage.clear();
        }
    }
};
