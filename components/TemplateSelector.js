"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/context/TranslationContext';

export default function TemplateSelector() {
    const { t } = useTranslation();
    const { workoutTemplates, startWorkout, friends, shareTemplate } = useStore();
    const [showShareModal, setShowShareModal] = useState(false);
    const [templateToShare, setTemplateToShare] = useState(null);
    const router = useRouter();

    return (
        <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>
            <h1 style={{ marginBottom: '24px' }}>{t('Start Workout')}</h1>

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
                            onClick={() => router.push(`/workout/edit?id=${template.id}`)}
                            style={{
                                flex: 1,
                                padding: '24px',
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <div>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{template.name}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {template.exercises.length} {t('Exercises')}
                                </p>
                            </div>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('Tap to Edit')} ✏️</span>
                        </button>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            borderLeft: '1px solid var(--border)'
                        }}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startWorkout(template.id);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '0 16px',
                                    background: 'var(--primary)',
                                    color: '#000',
                                    border: 'none',
                                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title="Start Workout"
                            >
                                ▶
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTemplateToShare(template);
                                    setShowShareModal(true);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '0 16px',
                                    background: 'var(--surface-highlight)',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer'
                                }}
                            >
                                📤
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <h3 style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{t('Quick Actions')}</h3>
                <Link href="/workout/create" style={{
                    display: 'block',
                    width: '100%',
                    padding: '16px',
                    border: '1px dashed var(--text-muted)',
                    color: 'var(--text-muted)',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    textAlign: 'center',
                    marginBottom: '16px'
                }}>
                    + {t('Create Custom Routine')}
                </Link>

                <Link href="/workout/history" style={{
                    display: 'block',
                    width: '100%',
                    padding: '16px',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    textAlign: 'center'
                }}>
                    📜 {t('View Workout History')}
                </Link>
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
                        <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>{t('Share')} "{templateToShare?.name}"</h3>

                        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {friends.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                                    {t('No friends found to share with.')}
                                </p>
                            ) : (
                                friends.map(friend => (
                                    <button
                                        key={friend.id}
                                        onClick={async () => {
                                            const success = await shareTemplate(templateToShare, friend.id);
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
                            {t('Cancel')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
