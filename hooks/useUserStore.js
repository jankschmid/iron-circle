"use client";

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

import { useToast } from '@/components/ToastProvider';
import { usePathname, useRouter } from 'next/navigation';

const supabase = createClient();

export function useUserStore() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Start true, set false after auth check
    const [gyms, setGyms] = useState([]); // User's gyms or Search results? 
    // In original store, 'gyms' was used for lookups.
    // But user.gyms is also a thing.
    // Let's keep `gyms` state here for "Nearby Gyms" or general usage.

    const toast = useToast();
    const router = useRouter();
    const isFetching = useRef(false);

    const fetchProfile = async (session) => {
        if (!session?.user) return null;
        try {
            // 1. Fetch Profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profileError) {
                console.error("fetchProfile Supabase Error (Profile):", profileError);
                throw profileError;
            }

            // Fallback if profile doesn't exist
            if (!profile) {
                console.warn("fetchProfile: No profile found for user:", session.user.id);
                return {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                    gyms: []
                };
            }

            // 2. Fetch User Gyms (Separate query to avoid join issues)
            const { data: userGyms, error: gymError } = await supabase
                .from('user_gyms')
                .select('gym_id, label, is_default')
                .eq('user_id', session.user.id);

            if (gymError) console.error("fetchProfile Supabase Error (UserGyms):", gymError);

            let formattedGyms = [];
            if (userGyms && userGyms.length > 0) {
                const gymIds = userGyms.map(ug => ug.gym_id);
                // 3. Fetch Gym Details
                const { data: gymDetails } = await supabase
                    .from('gyms')
                    .select('id, name, location, address, source')
                    .in('id', gymIds);

                const gymMap = new Map(gymDetails?.map(g => [g.id, g]) || []);

                formattedGyms = userGyms.map(ug => {
                    const g = gymMap.get(ug.gym_id);
                    return {
                        id: ug.gym_id,
                        name: g?.name,
                        label: ug.label,
                        location: g?.location,
                        address: g?.address,
                        source: g?.source,
                        isDefault: ug.is_default
                    };
                });
            }

            // Derive gymId (default gym or first gym)
            const defaultGym = formattedGyms.find(g => g.isDefault) || formattedGyms[0];
            const gymId = defaultGym ? defaultGym.id : null;

            return { ...profile, email: session.user.email, gyms: formattedGyms, gymId };
        } catch (e) {
            console.error("fetchProfile Exception:", e);
            return null;
        }
    };

    // Auth Listeners (simplified for brevity, assume similar to original)
    useEffect(() => {
        let mounted = true;

        // 1. Initial Session Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session).then(u => {
                    if (mounted) {
                        if (u) setUser(u);
                        setIsLoading(false);
                    }
                });
            } else {
                if (mounted) setIsLoading(false); // No user, stop loading
            }
        });

        // 2. Auth State Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    fetchProfile(session).then(u => {
                        if (mounted) {
                            setUser(u);
                            setIsLoading(false);
                        }
                    });
                }
            } else if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setUser(null);
                    setIsLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // --- GYM ACTIONS ---
    const fetchGyms = async (lat, lng) => {
        try {
            let data;
            if (lat && lng) {
                const { data: nearby, error } = await supabase.rpc('get_gyms_nearby', { lat, lng, radius_meters: 50000 });
                data = nearby;
            } else {
                const { data: all } = await supabase.from('gyms').select('id, name, address, location').limit(50);
                data = all;
            }
            setGyms(data || []);
            return data;
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const saveUserGym = async (name, lat, lng, label = 'My Gym', address = null, source = 'manual') => {
        if (!user) return;
        try {
            // 1. Create Gym
            const { data: gym } = await supabase.from('gyms').insert({
                name, location: `POINT(${lng} ${lat})`, address, source, created_by: user.id
            }).select().single();

            // 2. Link User
            await supabase.from('user_gyms').insert({
                user_id: user.id, gym_id: gym.id, label, is_default: (user.gyms?.length === 0)
            });

            // Refresh
            const refreshed = await fetchProfile({ user: { id: user.id, email: user.email } });
            setUser(refreshed);
        } catch (e) { console.error(e); }
    };

    const updateUserGym = async (gymId, updates) => {
        await supabase.from('user_gyms').update(updates).eq('user_id', user.id).eq('gym_id', gymId);
        const refreshed = await fetchProfile({ user });
        setUser(refreshed);
    };

    const removeUserGym = async (gymId) => {
        await supabase.from('user_gyms').delete().eq('user_id', user.id).eq('gym_id', gymId);
        setUser(prev => ({ ...prev, gyms: prev.gyms.filter(g => g.id !== gymId) }));
    };

    const updateGym = async (gymId, updates) => {
        await supabase.from('gyms').update(updates).eq('id', gymId).eq('created_by', user.id);
        // Optimistic update
        setUser(prev => ({
            ...prev,
            gyms: prev.gyms.map(g => g.id === gymId ? { ...g, ...updates } : g)
        }));
    };

    const deleteGlobalGym = async (gymId) => {
        await supabase.from('user_gyms').delete().eq('gym_id', gymId);
        await supabase.from('gyms').delete().eq('id', gymId).eq('created_by', user.id);
        setUser(prev => ({ ...prev, gyms: prev.gyms.filter(g => g.id !== gymId) }));
    };

    const setDefaultGym = async (gymId) => {
        await supabase.from('user_gyms').update({ is_default: false }).eq('user_id', user.id);
        await supabase.from('user_gyms').update({ is_default: true }).eq('user_id', user.id).eq('gym_id', gymId);
        setUser(prev => ({
            ...prev,
            gyms: prev.gyms.map(g => ({ ...g, isDefault: g.id === gymId }))
        }));
    };

    const updateUserProfile = (updates) => setUser(prev => ({ ...prev, ...updates }));

    const updateProfileData = async (updates) => {
        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        if (!error) setUser(prev => ({ ...prev, ...updates }));
    };

    const updatePrivacySettings = async (settings) => {
        const newSettings = { ...user.privacy_settings, ...settings };
        await supabase.from('profiles').update({ privacy_settings: newSettings }).eq('id', user.id);
        setUser(prev => ({ ...prev, privacy_settings: newSettings }));
    };

    const toggleUnits = () => {
        setUser(prev => ({ ...prev, units: prev.units === 'kg' ? 'lbs' : 'kg' }));
    };

    return {
        user, setUser,
        isLoading,
        gyms, setGyms, // Nearby gyms
        fetchGyms,
        updateUserProfile,
        updateProfileData,
        updatePrivacySettings,
        toggleUnits,

        saveUserGym,
        updateUserGym,
        removeUserGym,
        updateGym,
        deleteGlobalGym,
        setDefaultGym
    };
}
