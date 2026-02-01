"use client";

import { useEffect, useRef, useState } from 'react';

export default function InputModal({ isOpen, title, initialValue = '', fields = [], onConfirm, onCancel, confirmText = 'Save', cancelText = 'Cancel' }) {
    // fields: [{ name: 'title', label: 'Title', type: 'text', defaultValue: '' }]
    // If fields is provided, it overrides initialValue (which is for single input)

    // Internal state for inputs
    const [values, setValues] = useState({});
    const firstInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            // Initialize values
            if (fields.length > 0) {
                const init = {};
                fields.forEach(f => init[f.name] = f.defaultValue || '');
                setValues(init);
            } else {
                setValues({ value: initialValue });
            }
            // Focus
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [isOpen, initialValue, fields]);

    const handleChange = (name, val) => {
        setValues(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (fields.length > 0) {
            onConfirm(values);
        } else {
            onConfirm(values.value);
        }
    };

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
                maxWidth: '400px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
            }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', color: 'var(--foreground)' }}>{title}</h3>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {fields.length > 0 ? (
                        fields.map((field, i) => (
                            <div key={field.name}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{field.label}</label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        ref={i === 0 ? firstInputRef : null}
                                        value={values[field.name] || ''}
                                        onChange={e => handleChange(field.name, e.target.value)}
                                        style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--foreground)', minHeight: '80px' }}
                                    />
                                ) : (
                                    <input
                                        ref={i === 0 ? firstInputRef : null}
                                        type={field.type || 'text'}
                                        value={values[field.name] || ''}
                                        onChange={e => handleChange(field.name, e.target.value)}
                                        style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                                    />
                                )}
                            </div>
                        ))
                    ) : (
                        <input
                            ref={firstInputRef}
                            value={values.value || ''}
                            onChange={e => handleChange('value', e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                        />
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                flex: 1, padding: '12px', background: 'transparent',
                                border: '1px solid var(--border)', color: 'var(--text-main)',
                                borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            type="submit"
                            style={{
                                flex: 1, padding: '12px', background: 'var(--primary)',
                                border: 'none', color: '#000', fontWeight: 'bold',
                                borderRadius: '8px', cursor: 'pointer'
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
