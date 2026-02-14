"use client";

import { useStore } from '@/lib/store';
import { useState } from 'react';

import { useTranslation } from '@/context/TranslationContext';
import ErrorBoundary from './ErrorBoundary';

function LiveStatusContent() {
    const { t } = useTranslation();
    const { friends, user, workoutSession, activeWorkout, exercises } = useStore();
    const [selectedFriend, setSelectedFriend] = useState(null);

    const activeFriends = friends.filter(f => f.status === 'active');

    // Construct "Me" object with new structure
    let myActivity = null;
    if (user) {
        myActivity = {
            id: user.id,
            name: 'You',
            avatar: user.avatar,
            activity: {
                tracker: workoutSession ? {
                    location: workoutSession.gyms?.name || t('Unknown Gym'),
                    startTime: workoutSession.start_time
                } : null,
                workout: activeWorkout ? {
                    name: activeWorkout.name,
                    status: 'Active', // Simplified for "Me"
                    detail: activeWorkout.name,
                    startTime: activeWorkout.startTime
                } : null
            }
        };
        // Only include "Me" if actually active in some way? 
        // Or always show "Me"? User asked for "No Workout Started" so likely implies always showing status if desired, 
        // but traditionally Live Circle only shows ACTIVE people. 
        // Let's stick to showing "Me" if EITHER tracker OR workout is active, or if strictly following "Live" concept.
        // User said: "Beide sollen immer da sein aber wenn keine zeit da steht... Workout = No Workout... Location = Not in Gym"
        // This implies for ANYONE shown in the circle, these fields should be populated.
        // It doesn't necessarily mean "Show me even if I'm doing nothing". Usually "Me" appears when I start something.
        if (!workoutSession && !activeWorkout) myActivity = null;
    }

    const allActive = myActivity ? [myActivity, ...activeFriends] : activeFriends;

    return (
        <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.2rem' }}>{t('Live Circle')}</h3>
                <span style={{ fontSize: '0.9rem', color: 'var(--success)' }}>● {allActive.length} {t('Active')}</span>
            </div>

            <div style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollbarWidth: 'none' /* Firefox */
            }}>
                {allActive.map(friend => {
                    const { tracker, workout } = friend.activity || {};

                    return (
                        <div
                            key={friend.id}
                            onClick={() => friend.name !== 'You' && setSelectedFriend(friend)}
                            style={{
                                minWidth: '180px', // Slightly wider for split view
                                background: friend.name === 'You' ? 'var(--primary-dimmer, rgba(255, 152, 0, 0.1))' : 'var(--surface-highlight)',
                                padding: '12px',
                                borderRadius: 'var(--radius-md)',
                                border: friend.name === 'You' ? '1px solid var(--primary)' : '1px solid var(--border)',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: friend.name !== 'You' ? 'pointer' : 'default',
                                transition: 'transform 0.1s',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {/* Header: Avatar + Name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <img src={friend.avatar} alt={friend.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {friend.name.split(' ')[0]}
                                    </div>
                                </div>
                                {/* Live Dot */}
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: 'var(--success)', boxShadow: '0 0 5px var(--success)'
                                }} />
                            </div>

                            {/* Section 1: Workout */}
                            <div style={{
                                padding: '8px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '6px',
                                minHeight: '50px'
                            }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                                    {t('Current Workout')}
                                </div>
                                {workout ? (
                                    <>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {workout.detail || workout.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                            {workout.status !== 'Active' ? workout.status : (
                                                <span style={{ color: 'var(--brand-yellow)' }}>{Math.floor((new Date() - new Date(workout.startTime)) / 1000 / 60)}m</span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                        {t('No Workout Started')}
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Location */}
                            <div style={{
                                padding: '8px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '6px',
                                minHeight: '50px'
                            }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                                    {t('Location')}
                                </div>
                                {tracker ? (
                                    <>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            📍 {tracker.location}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                            {Math.floor((new Date() - new Date(tracker.startTime)) / 1000 / 60)}m
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                        {t('Not in Gym')}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {allActive.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', width: '100%', fontStyle: 'italic' }}>
                        {t('No one is training right now. Be the first.')}
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
                                <div style={{ color: 'var(--success)', fontSize: '0.9rem' }}>● {t('Currently Live')}</div>
                            </div>
                        </div>

                        {(() => {
                            const { tracker, workout } = selectedFriend.activity || {};

                            return (
                                <div style={{ marginBottom: '24px' }}>
                                    {/* Workout Section */}
                                    <div style={{ background: 'var(--surface-highlight)', padding: '16px', borderRadius: '12px', marginBottom: '12px' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                            {t('Current Workout')}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                                    {workout ? (workout.detail || workout.name) : t('No Workout Started')}
                                                </div>
                                                <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                                    {workout?.status || ''}
                                                </div>
                                            </div>
                                            {workout && (
                                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--brand-yellow)' }}>
                                                    {Math.floor((new Date() - new Date(workout.startTime)) / 1000 / 60)}m
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Location Section */}
                                    <div style={{ background: 'var(--surface-highlight)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                {t('Location')}
                                            </div>
                                            <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                                {tracker ? `📍 ${tracker.location}` : t('Not in Gym')}
                                            </div>
                                        </div>
                                        {tracker && (
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                    {t('Session Time')}
                                                </div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                    {Math.floor((new Date() - new Date(tracker.startTime)) / 1000 / 60)}m
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Full Progress Preview (if available) */}
                                    {workout?.fullLogs && (
                                        <div style={{ maxHeight: '250px', overflowY: 'auto', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px' }}>{t('Workout Progress')}</div>
                                            {workout.fullLogs.map((log, i) => {
                                                const exName = log.exerciseName || exercises.find(e => e.id === log.exercise_id)?.name || t('Unknown Exercise');
                                                const total = log.sets.length;
                                                const completed = log.sets.filter(s => s.completed).length;
                                                const isDone = completed === total && total > 0;
                                                const isCurrent = !isDone && completed < total && (i === 0 || i > 0 && workout.fullLogs[i - 1].sets.every(s => s.completed));

                                                return (
                                                    <div key={i} style={{
                                                        display: 'flex', justifyContent: 'space-between', marginBottom: '8px',
                                                        opacity: isDone ? 0.5 : 1,
                                                        color: isCurrent ? 'var(--brand-yellow)' : 'inherit',
                                                        fontWeight: isCurrent ? 'bold' : 'normal'
                                                    }}>
                                                        <span style={{ fontSize: '0.9rem' }}>{exName}</span>
                                                        <span style={{ fontSize: '0.85rem' }}>
                                                            {isDone ? t('Finished') : `${completed}/${total} ${t('Sets')}`}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {!workout?.fullLogs && workout && (
                                        <div style={{ fontStyle: 'italic', color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '16px' }}>
                                            {t('No detailed plan data available.')}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </section>
    );
}

export default function LiveStatus() {
    return (
        <ErrorBoundary message="Live Circle unavailable">
            <LiveStatusContent />
        </ErrorBoundary>
    );
}
