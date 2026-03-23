"use client";

import { useStore } from '@/lib/store';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

function HistoryDetailContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();
    const { history, exercises, deleteWorkoutHistory, updateWorkoutHistory, shareWorkout, friends } = useStore();
    const [session, setSession] = useState(null);
    const [editSession, setEditSession] = useState(null); // Local editing copy
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        if (history && id) {
            const found = history.find(s => s.id === id);
            setSession(found);
        }
    }, [history, id]);

    if (!id) return <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Workout ID missing</div>;
    if (!session) return <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Loading or not found...</div>;

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteWorkoutHistory(id);
            // Navigate only after success
            router.push('/workout/history');
        } catch (err) {
            console.error(err);
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleEditStart = () => {
        setEditSession(JSON.parse(JSON.stringify(session))); // Deep copy
        setIsEditing(true);
    };

    const handleEditCancel = () => {
        setEditSession(null);
        setIsEditing(false);
    };

    const handleEditSave = async () => {
        try {
            await updateWorkoutHistory(session.id, editSession);
            setSession(editSession); // Optimistic update of view
            setIsEditing(false);
            setEditSession(null);
        } catch (err) {
            alert("Failed to save changes");
        }
    };

    const handleSetChange = (exerciseIndex, setIndex, field, value) => {
        setEditSession(prev => {
            const newLogs = [...prev.logs];
            const newSets = [...newLogs[exerciseIndex].sets];
            newSets[setIndex] = { ...newSets[setIndex], [field]: value };
            newLogs[exerciseIndex] = { ...newLogs[exerciseIndex], sets: newSets };
            return { ...prev, logs: newLogs };
        });
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
                <Link href="/workout/history" style={{ display: 'inline-block', marginBottom: '16px', color: 'var(--text-muted)' }}>← Back to History</Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{session.name}</h1>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {formatDate(session.endTime || session.startTime)}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '24px', fontSize: '1rem', alignItems: 'center' }}>
                    <div>
                        <span style={{ color: 'var(--text-muted)' }}>Duration: </span>
                        <span style={{ fontWeight: 'bold' }}>{Math.round((session.duration || 0) / 60)} min</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)' }}>Volume: </span>
                        <span style={{ fontWeight: 'bold' }}>{Math.round(session.volume || 0)} kg</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)' }}>Visibility: </span>
                        {isEditing ? (
                            <select
                                value={editSession.visibility || 'private'}
                                onChange={e => setEditSession({ ...editSession, visibility: e.target.value })}
                                style={{
                                    background: 'var(--surface-highlight)',
                                    color: 'var(--foreground)',
                                    border: '1px solid var(--border)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <option value="private">Private</option>
                                <option value="friends">Friends Only</option>
                                <option value="public">Public</option>
                            </select>
                        ) : (
                            <span style={{
                                fontWeight: 'bold',
                                color: (session.visibility || 'private') === 'public' ? 'var(--success)' : (session.visibility === 'friends' ? 'var(--primary)' : 'var(--text-muted)')
                            }}>
                                {(session.visibility || 'private').charAt(0).toUpperCase() + (session.visibility || 'private').slice(1)}
                            </span>
                        )}
                    </div>

                    {!isEditing ? (
                        <>
                            <button
                                onClick={() => setShowShareModal(true)}
                                style={{
                                    marginLeft: 'auto',
                                    background: 'var(--surface-highlight)',
                                    color: 'var(--primary)',
                                    border: '1px solid var(--border)',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    marginRight: '8px'
                                }}
                            >
                                Share
                            </button>
                            <button
                                onClick={handleEditStart}
                                style={{
                                    marginLeft: 'auto',
                                    background: 'var(--primary)',
                                    color: '#000',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isDeleting}
                                style={{
                                    marginLeft: '8px',
                                    background: 'var(--error-dim)',
                                    color: 'var(--error)',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    opacity: isDeleting ? 0.5 : 1
                                }}
                            >
                                Delete
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleEditSave}
                                style={{
                                    marginLeft: 'auto',
                                    background: 'var(--success)',
                                    color: '#000',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Save
                            </button>
                            <button
                                onClick={handleEditCancel}
                                style={{
                                    marginLeft: '8px',
                                    background: 'var(--surface-highlight)',
                                    color: 'var(--text-main)',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Confirmation Modal */}
            {showDeleteConfirm && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--surface)',
                        padding: '24px',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '320px',
                        textAlign: 'center',
                        border: '1px solid var(--border)'
                    }}>
                        <h3 style={{ marginBottom: '16px' }}>Delete History?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                            Permanently remove this workout record?
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                style={{ flex: 1, padding: '12px', background: 'var(--error)', border: 'none', color: '#FFF', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {(isEditing ? editSession : session).logs.map((log, index) => {
                    const exerciseDef = exercises.find(e => e.id === log.exerciseId);

                    return (
                        <div key={index} style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '16px'
                        }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '16px' }}>
                                {exerciseDef?.name || log.exerciseId}
                            </h3>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>Set</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>kg</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>Reps</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>RIR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {log.sets.map((set, setIndex) => (
                                        <tr key={setIndex} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                            <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-dim)' }}>{setIndex + 1}</td>
                                            <td style={{ padding: isEditing ? '4px' : '12px', textAlign: 'center', fontWeight: 'bold' }}>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={set.weight}
                                                        onChange={e => handleSetChange(index, setIndex, 'weight', e.target.value)}
                                                        style={{ width: '60px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)', textAlign: 'center' }}
                                                    />
                                                ) : set.weight}
                                            </td>
                                            <td style={{ padding: isEditing ? '4px' : '12px', textAlign: 'center' }}>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={set.reps}
                                                        onChange={e => handleSetChange(index, setIndex, 'reps', e.target.value)}
                                                        style={{ width: '60px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)', textAlign: 'center' }}
                                                    />
                                                ) : set.reps}
                                            </td>
                                            <td style={{ padding: isEditing ? '4px' : '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                {isEditing ? (
                                                    <input
                                                        type="number" // or text for RPE/RIR
                                                        value={set.rpe || ''}
                                                        onChange={e => handleSetChange(index, setIndex, 'rpe', e.target.value)}
                                                        style={{ width: '60px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)', textAlign: 'center' }}
                                                        placeholder="-"
                                                    />
                                                ) : (set.rpe || '-')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
            {/* Share Modal */}
            {showShareModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setShowShareModal(false)}>
                    <div style={{
                        background: 'var(--surface)',
                        padding: '24px',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '350px',
                        border: '1px solid var(--border)',
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Share Workout</h3>

                        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {friends.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                                    No friends found to share with.
                                </p>
                            ) : (
                                friends.map(friend => (
                                    <button
                                        key={friend.id}
                                        onClick={async () => {
                                            const success = await shareWorkout(session, friend.id);
                                            if (success) {
                                                alert(`Shared with ${friend.name}!`);
                                                setShowShareModal(false);
                                            } else {
                                                alert("Failed to share.");
                                            }
                                        }}
                                        style={{
                                            padding: '12px',
                                            background: 'var(--background)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            color: 'var(--foreground)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border)', overflow: 'hidden' }}>
                                            {friend.avatar_url && <img src={friend.avatar_url} style={{ width: '100%', height: '100%' }} />}
                                        </div>
                                        <span>{friend.name}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => setShowShareModal(false)}
                            style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                color: 'var(--text-main)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                width: '100%'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Page() {
    return (
        <ErrorBoundary message="Session unavailable">
            <Suspense fallback={<div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))', textAlign: 'center' }}>Loading Session...</div>}>
                <HistoryDetailContent />
            </Suspense>
        </ErrorBoundary>
    );
}
