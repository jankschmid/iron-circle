"use client";

import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useStore } from '@/lib/store';

function ClientWorkoutDetailContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const clientId = searchParams.get('clientId');
    const router = useRouter();
    const supabase = createClient();
    const { exercises } = useStore();

    const [session, setSession] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetchWorkoutDetails();
    }, [id]);

    const fetchWorkoutDetails = async () => {
        setLoading(true);
        try {
            // Fetch the workout
            const { data: workoutData, error: wError } = await supabase
                .from('workouts')
                .select('*')
                .eq('id', id)
                .single();

            if (wError) throw wError;
            setSession(workoutData);

            // Fetch the logs
            const { data: logsData, error: lError } = await supabase
                .from('workout_logs')
                .select('*')
                .eq('workout_id', id)
                .order('created_at', { ascending: true });

            if (lError) throw lError;

            // Map and format logs
            const formattedLogs = logsData.map(log => {
                const exerciseDef = exercises.find(e => e.id === log.exercise_id);
                const exerciseName = exerciseDef?.name || log.exercise_id;
                
                let setsArray = [];
                if (typeof log.sets === 'string') {
                    try { setsArray = JSON.parse(log.sets); } catch(e){}
                } else if (Array.isArray(log.sets)) {
                    setsArray = log.sets;
                }

                return {
                    exerciseId: log.exercise_id,
                    exerciseName,
                    sets: setsArray
                };
            });

            setLogs(formattedLogs);
        } catch (error) {
            console.error("Error fetching workout details", error);
        } finally {
            setLoading(false);
        }
    };

    if (!id) return <div className="portal-container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Workout ID missing</div>;
    if (loading) return <div className="portal-container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Loading workout details...</div>;
    if (!session) return <div className="portal-container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Workout not found.</div>;

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const durationMin = Math.round((new Date(session.end_time) - new Date(session.start_time)) / 60000) || 0;

    return (
        <div className="portal-container" style={{ paddingBottom: '100px', padding: '20px' }}>
            <header style={{ padding: '24px 0', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
                <Link href={`/trainer/dashboard/client?id=${clientId || session.user_id}`} style={{ display: 'inline-block', marginBottom: '16px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                    ← Back to Athlete Profile
                </Link>
                
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{session.name || 'Unnamed Session'}</h1>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {formatDate(session.end_time || session.start_time)}
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '24px', fontSize: '1rem', alignItems: 'center' }}>
                    <div>
                        <span style={{ color: 'var(--text-muted)' }}>Duration: </span>
                        <span style={{ fontWeight: 'bold' }}>{durationMin} min</span>
                    </div>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {logs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No sets recorded for this workout.</div>
                ) : (
                    logs.map((group, index) => (
                        <div key={index} style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '16px'
                        }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '16px' }}>
                                {group.exerciseName}
                            </h3>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>Set</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>kg</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>Reps</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.sets.map((set, setIndex) => (
                                        <tr key={setIndex} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                            <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-dim)' }}>{setIndex + 1}</td>
                                            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                                                {set.weight}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                {set.reps}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <ErrorBoundary message="Session unavailable">
            <Suspense fallback={<div className="portal-container" style={{ paddingTop: 'calc(40px + var(--safe-top))', textAlign: 'center' }}>Loading Session...</div>}>
                <ClientWorkoutDetailContent />
            </Suspense>
        </ErrorBoundary>
    );
}
