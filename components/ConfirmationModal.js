"use client";

export default function ConfirmationModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isDangerous = false }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }} onClick={onCancel}>
            <div style={{
                background: 'var(--surface)',
                padding: '24px',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '350px',
                border: '1px solid var(--border)',
                textAlign: 'center',
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
            }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginBottom: '12px', fontSize: '1.2rem', color: 'var(--foreground)' }}>{title}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--text-main)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: isDangerous ? 'var(--error)' : 'var(--primary)',
                            border: 'none',
                            color: isDangerous ? '#fff' : '#000',
                            fontWeight: 'bold',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
