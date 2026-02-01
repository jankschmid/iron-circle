"use client";

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext({});

export const useToast = () => useContext(ToastContext);

// A simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = generateId();
        setToasts(prev => [...prev, { id, message, type, duration }]);

        // Auto-remove
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Helper functions
    const success = (msg, duration) => addToast(msg, 'success', duration);
    const error = (msg, duration) => addToast(msg, 'error', duration);
    const info = (msg, duration) => addToast(msg, 'info', duration);
    const warning = (msg, duration) => addToast(msg, 'warning', duration);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

function ToastContainer({ toasts, removeToast }) {
    // Determine if we are on client (for portal)
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'center',
            width: '90%',
            maxWidth: '400px',
            pointerEvents: 'none' // Allow clicks through container
        }}>
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
                ))}
            </AnimatePresence>
        </div>,
        document.body
    );
}

function ToastItem({ toast, onRemove }) {
    const colors = {
        success: { bg: 'var(--success)', color: '#000', icon: '✅' },
        error: { bg: 'var(--error)', color: '#fff', icon: '⚠️' },
        warning: { bg: 'var(--warning)', color: '#000', icon: '⚠️' },
        info: { bg: 'var(--surface)', color: 'var(--foreground)', icon: 'ℹ️' }
    };

    const style = colors[toast.type] || colors.info;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            onClick={onRemove}
            style={{
                background: style.bg,
                color: style.color,
                padding: '12px 16px',
                borderRadius: '50px', // Pill shape
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                pointerEvents: 'auto', // Re-enable clicks
                fontWeight: '600',
                fontSize: '0.9rem',
                border: '1px solid rgba(255,255,255,0.1)',
                overflow: 'hidden'
            }}
        >
            <span>{style.icon}</span>
            <span>{toast.message}</span>
        </motion.div>
    );
}
