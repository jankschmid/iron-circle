"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function FriendProfilePage() {
    const { user, friends, fetchFriendWorkouts, addWorkoutTemplate } = useStore();
    const router = useRouter();
    const params = useParams();
    const supabase = createClient(); // Need this if we fetch non-friends

    const friendId = params.id;

    // State
    const [profile, setProfile] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [stats, setStats] = useState({ volume: 0, streak: 0 });
    const [loading, setLoading] = useState(true);

    // 1. Fetch Profile & Workouts
    useEffect(() => {
        if (!friendId) return;

        // Redirect to own profile if clicking self
        if (user && friendId === user.id) {
            router.replace('/profile');
            return;
        }

        const loadData = async () => {
            setLoading(true);
            try {
                // Try finding in store first
                let friendData = friends.find(f => f.id.toString() === friendId);

                // If not friend, fetch basic profile
                if (!friendData) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('id, name, username, avatar_url, bio')
                        .eq('id', friendId)
                        .single();

                    if (data) {
                        friendData = {
                            id: data.id,
                            name: data.name,
                            handle: '@' + data.username,
                            avatar: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.id}`,
                            bio: data.bio
                        };
                    }
                }

                setProfile(friendData);

                // Fetch Workouts
                if (fetchFriendWorkouts) {
                    const userWorkouts = await fetchFriendWorkouts(friendId);
                    setWorkouts(userWorkouts);

                    // valid stats from workouts
                    let totalVol = 0;
                    // Mock streak calculation or use dates
                    userWorkouts.forEach(w => totalVol += w.volume || 0);

                    setStats({
                        volume: totalVol,
                        streak: userWorkouts.length // simplified
                    });
                }

            } catch (err) {
                console.error("Error loading profile:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [friendId, user, friends]); // Re-run if friends list updates

    const handleCopyWorkout = (workout) => {
        const newTemplate = {
            name: `${workout.name} (Copy)`,
            exercises: workout.exercises.map(exName => ({
                id: exName.toLowerCase().replace(/\s+/g, '-'), // simplistic mapping
                name: exName,
                sets: [{ reps: 10 }] // default
            }))
        };
        addWorkoutTemplate(newTemplate);
        router.push('/workout');
    };

    if (loading) return <div className="container" style={{ paddingTop: '40px' }}>Loading...</div>;
    if (!profile) return <div className="container" style={{ paddingTop: '40px' }}>User not found</div>;

    const isFriend = friends.some(f => f.id === profile.id);

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', marginBottom: '16px' }}>
                    <Link href="/social" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</Link>
                </div>

                <img
                    src={profile.avatar}
                    style={{
                        width: '96px',
                        height: '96px',
                        borderRadius: '50%',
                        border: '3px solid var(--primary)',
                        objectFit: 'cover',
                        marginBottom: '16px'
                    }}
                />
                <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{profile.name}</h1>
                <p style={{ color: 'var(--text-muted)' }}>{profile.handle}</p>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <Link href={`/social/chat/${profile.id}`} style={{
                        padding: '8px 24px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '100px',
                        color: 'var(--foreground)',
                        fontWeight: '600',
                        textDecoration: 'none'
                    }}>
                        Message
                    </Link>
                    <button style={{
                        padding: '8px 24px',
                        background: isFriend ? 'var(--primary-dim)' : 'var(--primary)',
                        border: 'none',
                        borderRadius: '100px',
                        color: isFriend ? 'var(--primary)' : '#000',
                        fontWeight: '600'
                    }}>
                        {isFriend ? 'Friends' : 'Add Friend'}
                    </button>
                </div>
            </header>

            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Stats</h3>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-md)', flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{(stats.volume / 1000).toFixed(0)}k</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Volume</div>
                    </div>
                    <div style={{ textAlign: 'center', background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-md)', flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{workouts.length}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Workouts</div>
                    </div>
                </div>
            </section>

            <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Recent Workouts</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                    {workouts.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No workouts yet.</div>
                    ) : (
                        workouts.map((w) => (
                            <div key={w.id} style={{
                                background: 'var(--surface)',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: '600' }}>{w.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {new Date(w.endTime).toLocaleDateString()} • {w.volume}kg
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCopyWorkout(w)}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'var(--primary-dim)',
                                        color: 'var(--primary)',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: '600'
                                    }}
                                >
                                    Copy
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
