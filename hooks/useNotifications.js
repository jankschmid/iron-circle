"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';

const supabase = createClient();

export function useNotifications(user) {
    const toast = useToast();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        setNotifications(data || []);

        const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);
        setUnreadCount(count || 0);
    };

    const markAsRead = async (id) => {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllRead = async () => {
        await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    useEffect(() => {
        if (!user) return;

        fetchNotifications();

        const channel = supabase.channel('system_notifications')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    const newNotif = payload.new;
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Show Toast
                    toast.info(newNotif.message);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllRead,
        fetchNotifications
    };
}
