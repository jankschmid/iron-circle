"use client";

import { useStore } from '@/lib/store';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HistoryDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { history, exercises, deleteWorkoutHistory } = useStore();
    const [session, setSession] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (history && id) {
            const found = history.find(s => s.id === id);
            setSession(found);
        }
    }, [history, id]);

    if (!session) return <div className="container" style={{ paddingTop: '40px' }}>Loading or not found...</div>;

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

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
                <Link href="/workout/history" style={{ display: 'inline-block', marginBottom: '16px', color: 'var(--text-muted)' }}>← Back to History</Link>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{session.name}</h1>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {formatDate(session.endTime || session.startTime)}
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
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isDeleting}
                        style={{
                            marginLeft: 'auto',
                            background: 'var(--error-dim)',
                            color: 'var(--error)',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            opacity: isDeleting ? 0.5 : 1
                        }}
                    >
                        Delete Entry
                    </button>
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
                {session.logs.map((log, index) => {
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
                                            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{set.weight}</td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>{set.reps}</td>
                                            <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>{set.rpe || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
