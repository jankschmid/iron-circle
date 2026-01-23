"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

export default function FriendProfilePage() {
    const { friends, startWorkout, addWorkoutTemplate } = useStore();
    const router = useRouter();
    const params = useParams();

    // Access params via hook
    const friendId = params.id;
    const friend = friends.find(f => f.id.toString() === friendId);

    if (!friend) {
        return <div className="container" style={{ paddingTop: '40px' }}>User not found</div>;
    }

    // Mock friend's recent workouts
    const recentWorkouts = [
        { id: 'fw1', name: 'Upper Power', date: '2d ago', volume: '12,500kg', exercises: [] }, // In real app would have exercises
        { id: 'fw2', name: 'Leg Hypertrophy', date: '5d ago', volume: '18,200kg', exercises: [] },
        { id: 'fw3', name: 'Full Body', date: '1w ago', volume: '15,000kg', exercises: [] },
    ];

    const handleCopyWorkout = (workoutName) => {
        // Create a basic template from the friend's workout
        const newTemplate = {
            name: `${workoutName} (Copied)`,
            exercises: [] // In real app, we'd copy the structure
        };
        addWorkoutTemplate(newTemplate);

        // alert(`Copied ${workoutName} to your templates!`);
        // Instead of alert, redirect to workoutHub where they can see it
        router.push('/workout');
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', marginBottom: '16px' }}>
                    <Link href="/social" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</Link>
                </div>

                <img
                    src={friend.avatar}
                    style={{
                        width: '96px',
                        height: '96px',
                        borderRadius: '50%',
                        border: '3px solid var(--primary)',
                        objectFit: 'cover',
                        marginBottom: '16px'
                    }}
                />
                <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{friend.name}</h1>
                <p style={{ color: 'var(--text-muted)' }}>{friend.handle}</p>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <Link href={`/social/chat/${friend.id}`} style={{
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
                        background: 'var(--primary)',
                        border: 'none',
                        borderRadius: '100px',
                        color: '#000',
                        fontWeight: '600'
                    }}>
                        Following
                    </button>
                </div>
            </header>

            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Stats</h3>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-md)', flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{friend.volume ? (friend.volume / 1000).toFixed(0) + 'k' : '24k'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Volume</div>
                    </div>
                    <div style={{ textAlign: 'center', background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-md)', flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>8</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Streak</div>
                    </div>
                </div>
            </section>

            <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Recent Workouts</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                    {recentWorkouts.map((w) => (
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
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{w.date} • {w.volume}</div>
                            </div>
                            <button
                                onClick={() => handleCopyWorkout(w.name)}
                                style={{
                                    padding: '6px 12px',
                                    background: 'var(--primary-dim)',
                                    color: 'var(--primary)',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: '600'
                                }}
                            >
                                Copy This
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
