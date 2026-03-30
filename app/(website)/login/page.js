'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/context/TranslationContext'
import LanguageSelector from '@/components/ui/LanguageSelector'
import { Capacitor } from '@capacitor/core'

export default function LoginPage() {
    const { t } = useTranslation()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [debugInfo, setDebugInfo] = useState(null)
    const [showDebug, setShowDebug] = useState(false)
    const router = useRouter()
    const [supabase] = useState(() => createClient())
    const { user } = useStore ? useStore() : { user: null };

    // Collect debug info on mount
    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        setDebugInfo({
            platform: Capacitor.getPlatform(),
            isNative: Capacitor.isNativePlatform(),
            supabaseUrl: url ? `${url.substring(0, 30)}...` : '❌ UNDEFINED',
            supabaseKeyPrefix: key ? `${key.substring(0, 12)}...` : '❌ UNDEFINED',
            supabaseUrlFull: url || 'NOT SET',
            supabaseKeyLength: key ? key.length : 0,
            buildTime: new Date().toISOString(),
        });
    }, []);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.replace('/');
        }
    }, [user, router]);

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const loginPromise = supabase.auth.signInWithPassword({
                email,
                password,
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timed out. Please check your internet or try again.')), 30000)
            );

            const result = await Promise.race([loginPromise, timeoutPromise]);
            const { error: authError, data } = result;

            if (authError) {
                // Show full debug on error
                setShowDebug(true);
                setDebugInfo(prev => ({
                    ...prev,
                    lastError: authError.message,
                    lastErrorCode: authError.status,
                    lastErrorFull: JSON.stringify(authError, null, 2),
                }));
                let msg = authError.message
                if (msg.includes('Invalid login credentials')) msg = 'Incorrect email or password'
                if (msg.includes('Email not confirmed')) msg = 'Please verify your email address'
                throw new Error(msg);
            }

            const params = new URLSearchParams(window.location.search);
            const next = params.get('next');
            router.push(next ? decodeURIComponent(next) : '/');

        } catch (err) {
            setError(err.message || "Failed to sign in. Please try again.");
            setLoading(false);
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '16px', position: 'relative' }}>

            {/* Language Selector (Top Right) */}
            <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                <LanguageSelector position="bottom-right" />
            </div>

            <div style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', padding: '32px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <img src="/assets/logo/Iron-Circle_Logo_Two_Color.svg" alt="Iron Circle Logo" style={{ width: '64px', height: '64px', margin: '0 auto', display: 'block' }} />
                </div>
                <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '8px', textAlign: 'center' }}>{t('Welcome Back')}</h1>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '32px' }}>{t('Enter the Iron Circle.')}</p>

                {error && (
                    <div style={{ background: 'rgba(255, 23, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                        <label htmlFor="email" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '500' }}>{t('Email')}</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '500' }}>{t('Password')}</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--brand-yellow)',
                            color: '#000',
                            fontWeight: '700',
                            fontSize: '1rem',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'wait' : 'pointer'
                        }}
                    >
                        {loading ? t('Signing In...') : t('Sign In')}
                    </button>
                </form>

                <p style={{ marginTop: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {t("Don't have an account?")}{' '}
                    <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: '600' }}>
                        {t('Sign Up')}
                    </Link>
                </p>
            </div>

            {/* ── DEBUG PANEL ── */}
            <div style={{ width: '100%', maxWidth: '400px', marginTop: '16px' }}>
                <button
                    onClick={() => setShowDebug(v => !v)}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        letterSpacing: '0.05em'
                    }}
                >
                    {showDebug ? '▲ Hide Debug Info' : '▼ Show Debug Info'}
                </button>

                {showDebug && debugInfo && (
                    <div style={{
                        marginTop: '8px',
                        padding: '16px',
                        background: '#0a0a0a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                        color: '#aaa',
                        lineHeight: '1.8',
                        wordBreak: 'break-all'
                    }}>
                        <div style={{ color: '#FFD600', marginBottom: '8px', fontWeight: 'bold' }}>🔍 Debug Info</div>
                        <div><span style={{ color: '#666' }}>Platform:</span> <span style={{ color: debugInfo.isNative ? '#4CAF50' : '#FF9800' }}>{debugInfo.platform} {debugInfo.isNative ? '(Native ✓)' : '(Web)'}</span></div>
                        <div><span style={{ color: '#666' }}>Supabase URL:</span> <span style={{ color: debugInfo.supabaseUrlFull === 'NOT SET' ? '#f44336' : '#4CAF50' }}>{debugInfo.supabaseUrl}</span></div>
                        <div><span style={{ color: '#666' }}>Anon Key:</span> <span style={{ color: debugInfo.supabaseKeyLength === 0 ? '#f44336' : '#4CAF50' }}>{debugInfo.supabaseKeyPrefix} ({debugInfo.supabaseKeyLength} chars)</span></div>
                        <div><span style={{ color: '#666' }}>Build time:</span> {debugInfo.buildTime}</div>
                        {debugInfo.lastError && (
                            <>
                                <div style={{ borderTop: '1px solid #333', marginTop: '8px', paddingTop: '8px', color: '#f44336' }}>Last Error: {debugInfo.lastError}</div>
                                {debugInfo.lastErrorCode && <div><span style={{ color: '#666' }}>Status:</span> {debugInfo.lastErrorCode}</div>}
                                <pre style={{ marginTop: '8px', color: '#888', whiteSpace: 'pre-wrap', fontSize: '0.65rem' }}>{debugInfo.lastErrorFull}</pre>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

