"use client";

import { useStore } from '@/lib/store';
import Link from 'next/link';

export default function TemplateSelector() {
    const { workoutTemplates, startWorkout } = useStore();

    return (
        <div className="container" style={{ paddingTop: '40px' }}>
            <h1 style={{ marginBottom: '24px' }}>Start Workout</h1>

            <div style={{ display: 'grid', gap: '16px' }}>
                {workoutTemplates.map(template => (
                    <div key={template.id} style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'stretch',
                        overflow: 'hidden'
                    }}>
                        <button
                            onClick={() => startWorkout(template.id)}
                            style={{
                                flex: 1,
                                padding: '24px',
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <div>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{template.name}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {template.exercises.length} Exercises
                                </p>
                            </div>
                            <span style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>→</span>
                        </button>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            borderLeft: '1px solid var(--border)'
                        }}>
                            <Link
                                href={`/workout/edit/${template.id}`}
                                style={{
                                    flex: 1,
                                    padding: '0 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--surface-highlight)',
                                    color: 'var(--foreground)',
                                    fontSize: '1.2rem'
                                }}
                            >
                                ⚙️
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <h3 style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Quick Actions</h3>
                <Link href="/workout/create" style={{
                    display: 'block',
                    width: '100%',
                    padding: '16px',
                    border: '1px dashed var(--text-muted)',
                    color: 'var(--text-muted)',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    textAlign: 'center'
                }}>
                    + Create Custom Routine
                </Link>
            </div>
        </div>
    );
}
