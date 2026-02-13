"use client";

import { memo } from 'react';

const MessageBubble = memo(({ msg, isMe, isSequence, onSaveTemplate, onJoinSession, savedTemplates }) => {
    return (
        <div style={{
            alignSelf: isMe ? 'flex-end' : 'flex-start',
            maxWidth: '75%',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            {!isMe && !isSequence && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {msg.sender?.name || msg.sender?.username || 'User'}
                    {msg.sender?.is_super_admin ? (
                        <span style={{ fontSize: '0.65rem', background: '#FFD700', color: '#000', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>Owner</span>
                    ) : (
                        <>
                            {msg.sender?.role === 'owner' && <span style={{ fontSize: '0.65rem', background: 'var(--error)', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>Gym Admin</span>}
                            {msg.sender?.role === 'admin' && <span style={{ fontSize: '0.65rem', background: 'var(--brand-purple)', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>Staff</span>}
                            {msg.sender?.role === 'trainer' && <span style={{ fontSize: '0.65rem', background: 'var(--brand-yellow)', color: '#000', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>Trainer</span>}
                        </>
                    )}
                </div>
            )}
            <div style={{
                background: isMe
                    ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, var(--primary)) 100%)'
                    : 'var(--surface-highlight, #333)',
                color: isMe ? '#000' : 'var(--foreground)',
                padding: '12px 16px',
                borderRadius: '20px',
                borderTopRightRadius: isMe && isSequence ? '4px' : '20px',
                borderTopLeftRadius: !isMe && isSequence ? '4px' : '20px',
                borderBottomRightRadius: isMe ? '4px' : '20px',
                borderBottomLeftRadius: !isMe ? '4px' : '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                fontSize: '0.95rem',
                lineHeight: '1.4'
            }}>
                {msg.type === 'template_share' ? (
                    <div style={{ minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>📋</span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Workout Routine</span>
                        </div>
                        <div style={{ marginBottom: '8px', fontSize: '0.9rem' }}>
                            {msg.metadata?.name || 'Shared Routine'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                            {msg.metadata?.exercisesCount || 0} Exercises
                        </div>
                        {!isMe && (
                            <button
                                onClick={() => onSaveTemplate && onSaveTemplate(msg)}
                                disabled={savedTemplates?.has(msg.metadata?.templateId)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: savedTemplates?.has(msg.metadata?.templateId) ? 'var(--surface-highlight)' : 'var(--primary)',
                                    color: savedTemplates?.has(msg.metadata?.templateId) ? 'var(--text-muted)' : '#000',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: savedTemplates?.has(msg.metadata?.templateId) ? 'default' : 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {savedTemplates?.has(msg.metadata?.templateId) ? 'Saved' : 'Save to Library'}
                            </button>
                        )}
                    </div>
                ) : msg.type === 'workout_share' ? (
                    <div style={{ minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>🏁</span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Finished Workout</span>
                        </div>
                        <div style={{ marginBottom: '8px', fontSize: '0.9rem' }}>
                            {msg.metadata?.name || 'Workout'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Volume: {Math.round(msg.metadata?.volume || 0)} kg
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Date: {new Date(msg.metadata?.date).toLocaleDateString()}
                        </div>
                    </div>
                ) : msg.type === 'invite' || msg.type === 'workout_invite' ? (
                    <div style={{ minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>🏋️</span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Gym Session Invite</span>
                        </div>
                        <div style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
                            {msg.content}
                        </div>
                        {!isMe && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => onJoinSession && onJoinSession(msg)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'var(--brand-yellow)',
                                        color: '#000',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    Join
                                </button>
                                {/* Decline Logic could be passed if needed */}
                            </div>
                        )}
                    </div>
                ) : (
                    msg.content
                )}
            </div>
            {!isSequence && (
                <div style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-dim)',
                    marginTop: '4px',
                    textAlign: isMe ? 'right' : 'left',
                    padding: '0 4px',
                    opacity: 0.7
                }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            )}
        </div>
    );
}, (prev, next) => {
    // Custom comparison for performance
    return (
        prev.msg.id === next.msg.id &&
        prev.msg.content === next.msg.content &&
        prev.isMe === next.isMe &&
        prev.isSequence === next.isSequence &&
        prev.savedTemplates === next.savedTemplates &&
        prev.msg.sender?.role === next.msg.sender?.role &&
        prev.msg.sender?.is_super_admin === next.msg.sender?.is_super_admin
    );
});

export default MessageBubble;
