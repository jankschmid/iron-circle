"use client";

import { useStore } from '@/lib/store';

export default function LiveStatus() {
    const { friends, user, workoutSession, activeWorkout } = useStore();

    const activeFriends = friends.filter(f => f.status === 'active');

    // Construct "Me" object
    let myActivity = null;
    if (activeWorkout) {
        myActivity = {
            id: user?.id || 'me',
            name: 'You',
            avatar: user?.avatar,
            activity: {
                action: 'Workout Plan',
                detail: activeWorkout.name,
                location: 'Current Session',
                startTime: activeWorkout.startTime
            }
        };
    } else if (workoutSession) {
        myActivity = {
            id: user?.id || 'me',
            name: 'You',
            avatar: user?.avatar,
            activity: {
                action: 'Gym Session',
                detail: 'Checked In',
                location: 'Gym Tracker', // Or fetch gym name if available in session/store
                startTime: workoutSession.start_time
            }
        };
    }

    const allActive = myActivity ? [myActivity, ...activeFriends] : activeFriends;

    return (
        <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Live Circle</h3>
                <span style={{ fontSize: '0.9rem', color: 'var(--success)' }}>● {allActive.length} Active</span>
            </div>

            <div style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollbarWidth: 'none' /* Firefox */
            }}>
                {allActive.map(friend => (
                    <div key={friend.id} style={{
                        minWidth: '140px',
                        background: friend.name === 'You' ? 'var(--primary-dimmer, rgba(255, 152, 0, 0.1))' : 'var(--surface-highlight)',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: friend.name === 'You' ? '1px solid var(--primary)' : '1px solid var(--border)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Status Indicator */}
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--success)',
                            boxShadow: '0 0 8px var(--success)'
                        }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <img src={friend.avatar} alt={friend.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {friend.name.split(' ')[0]}
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '2px', fontWeight: 'bold' }}>
                            {friend.activity?.action}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {friend.activity?.detail}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                📍 {friend.activity?.location}
                            </div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                {Math.floor((new Date() - new Date(friend.activity?.startTime)) / 1000 / 60)}m
                            </div>
                        </div>
                    </div>
                ))}
                {allActive.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', width: '100%', fontStyle: 'italic' }}>
                        No one is training right now. Be the first.
                    </div>
                )}
            </div>
        </section>
    );
}
