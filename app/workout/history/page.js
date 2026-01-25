"use client";

import { useStore } from '@/lib/store';
import Link from 'next/link';

export default function HistoryPage() {
    const { history } = useStore();

    if (!history) return <div>Loading...</div>;

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString('de-DE', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/workout" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>History</h1>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {history.map((session) => (
                    <Link
                        href={`/workout/history/${session.id}`}
                        key={session.id}
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '16px',
                            display: 'block',
                            textDecoration: 'none',
                            color: 'inherit'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{session.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatDate(session.endTime || session.startTime)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            <span>⏱ {formatDuration(session.duration || 0)}</span>
                            <span>🏋️ {Math.round(session.volume || 0)} kg</span>
                        </div>
                    </Link>
                ))}

                {history.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                        No workouts completed yet.
                    </div>
                )}
            </div>
        </div>
    );
}
