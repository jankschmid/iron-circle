"use client";

import { useStore } from '@/lib/store';
import { useState } from 'react';

export default function LiveStatus() {
    const { friends, user, workoutSession, activeWorkout, exercises } = useStore();
    const [selectedFriend, setSelectedFriend] = useState(null);

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
                    <div
                        key={friend.id}
                        onClick={() => friend.name !== 'You' && setSelectedFriend(friend)}
                        style={{
                            minWidth: '160px',
                            background: friend.name === 'You' ? 'var(--primary-dimmer, rgba(255, 152, 0, 0.1))' : 'var(--surface-highlight)',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: friend.name === 'You' ? '1px solid var(--primary)' : '1px solid var(--border)',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: friend.name !== 'You' ? 'pointer' : 'default',
                            transition: 'transform 0.1s',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <img src={friend.avatar} alt={friend.name} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {friend.name.split(' ')[0]}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '2px', fontWeight: 'bold' }}>
                                {friend.activity?.action}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {friend.activity?.detail}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                            {/* Only show location if valid and not "Unknown" */}
                            {(friend.activity?.location && friend.activity.location !== 'Unknown Location' && friend.activity.location !== 'Unknown Gym') ? (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    📍 {friend.activity.location}
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                    Private Gym
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                    {Math.floor((new Date() - new Date(friend.activity?.startTime)) / 1000 / 60)}m
                                </div>
                                {friend.activity?.sessionStartTime && (
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                                        (Total: {Math.floor((new Date() - new Date(friend.activity.sessionStartTime)) / 1000 / 60)}m)
                                    </div>
                                )}
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

            {/* Detailed View Modal */}
            {selectedFriend && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    zIndex: 9999,
                    position: 'fixed', /* Redundant but safe */
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setSelectedFriend(null)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--surface)',
                            width: '100%',
                            maxWidth: '350px',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid var(--border)',
                            position: 'relative',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}
                    >
                        <button
                            onClick={() => setSelectedFriend(null)}
                            style={{
                                position: 'absolute', top: '16px', right: '16px',
                                background: 'transparent', border: 'none',
                                color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer'
                            }}
                        >
                            ×
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <img
                                src={selectedFriend.avatar}
                                alt={selectedFriend.name}
                                style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--primary)' }}
                            />
                            <div>
                                <h3 style={{ fontSize: '1.3rem', margin: 0 }}>{selectedFriend.name}</h3>
                                <div style={{ color: 'var(--success)', fontSize: '0.9rem' }}>● Currently Live</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            {/* Workout Section */}
                            <div style={{ background: 'var(--surface-highlight)', padding: '16px', borderRadius: '12px', marginBottom: '12px' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Current Workout
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                            {selectedFriend.activity?.action}
                                        </div>
                                        <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                            {selectedFriend.activity?.detail}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        {Math.floor((new Date() - new Date(selectedFriend.activity?.startTime)) / 1000 / 60)}m
                                    </div>
                                </div>
                            </div>

                            {/* Location Section */}
                            <div style={{ background: 'var(--surface-highlight)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Location
                                    </div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                        📍 {selectedFriend.activity?.location}
                                    </div>
                                </div>
                                {selectedFriend.activity?.sessionStartTime && (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                            Session Time
                                        </div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>
                                            {Math.floor((new Date() - new Date(selectedFriend.activity.sessionStartTime)) / 1000 / 60)}m
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Full Progress Preview (if available) */}
                        {selectedFriend.activity?.fullLogs && (
                            <div style={{ maxHeight: '250px', overflowY: 'auto', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px' }}>Workout Progress</div>
                                {selectedFriend.activity.fullLogs.map((log, i) => {
                                    const exName = log.exerciseName || exercises.find(e => e.id === log.exercise_id)?.name || 'Unknown Exercise';
                                    const total = log.sets.length;
                                    const completed = log.sets.filter(s => s.completed).length;
                                    const isDone = completed === total && total > 0;
                                    const isCurrent = !isDone && completed < total && (i === 0 || i > 0 && selectedFriend.activity.fullLogs[i - 1].sets.every(s => s.completed));

                                    return (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between', marginBottom: '8px',
                                            opacity: isDone ? 0.5 : 1,
                                            color: isCurrent ? 'var(--brand-yellow)' : 'inherit',
                                            fontWeight: isCurrent ? 'bold' : 'normal'
                                        }}>
                                            <span style={{ fontSize: '0.9rem' }}>{exName}</span>
                                            <span style={{ fontSize: '0.85rem' }}>
                                                {isDone ? 'Finished' : `${completed}/${total} Sets`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {!selectedFriend.activity?.fullLogs && (
                            <div style={{ fontStyle: 'italic', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                                No detailed plan data available.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
