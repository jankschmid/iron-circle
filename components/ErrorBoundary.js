"use client";

import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', margin: '16px 0' }}>
                    <h3 style={{ color: 'var(--error)', marginBottom: '8px' }}>Something went wrong</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                        {this.props.message || "We couldn't load this section."}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--surface-highlight)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: 'var(--text-main)'
                        }}
                    >
                        Try Again
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <details style={{ marginTop: '16px', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            <summary>Error Details</summary>
                            <pre style={{ overflow: 'auto' }}>{this.state.error?.toString()}</pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
