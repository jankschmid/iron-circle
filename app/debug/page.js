"use client";
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useState, useEffect } from 'react';

export default function DebugPage() {
    const { user, gyms } = useStore();
    const supabase = createClient();

    const [leaderboard, setLeaderboard] = useState(null);
    const [liveActivity, setLiveActivity] = useState(null);
    const [chatStaff, setChatStaff] = useState(null);

    useEffect(() => {
        if (user?.gymId) {
            // 1. Leaderboard
            supabase.rpc('get_gym_leaderboard', {
                p_gym_id: user.gymId,
                p_metric: 'volume',
                p_days: 30
            }).then(res => setLeaderboard(res));

            // 2. Live Activity
            supabase.rpc('get_live_gym_activity', {
                p_gym_id: user.gymId
            }).then(res => setLiveActivity(res));

            // 3. Chat Staff
            supabase.from('user_gyms')
                .select('user_id, role')
                .eq('gym_id', user.gymId)
                .in('role', ['owner', 'admin', 'trainer'])
                .then(res => setChatStaff(res));
        }
    }, [user?.gymId]);

    return (
        <div style={{ padding: 40, background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'monospace' }}>
            <h1>Gym Hub Debugger v2</h1>

            <h2>User Context</h2>
            <pre>{JSON.stringify({ userId: user?.id, gymId: user?.gymId, roles: gyms }, null, 2)}</pre>

            <h2>1. Leaderboard RPC (p_days: 30)</h2>
            <pre>{JSON.stringify(leaderboard, null, 2)}</pre>

            <h2>2. Live Activity RPC (No Key)</h2>
            <pre>{JSON.stringify(liveActivity, null, 2)}</pre>

            <h2>3. Chat Staff Query</h2>
            <pre>{JSON.stringify(chatStaff, null, 2)}</pre>
        </div>
    );
}
