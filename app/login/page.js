'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useTranslation } from '@/context/TranslationContext'
import LanguageSelector from '@/components/ui/LanguageSelector'

export default function LoginPage() {
    const { t } = useTranslation()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    // Fix: Singleton client
    const [supabase] = useState(() => createClient())

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Using state values for email/password which are string primitives
            // Race Supabase against a 10s timeout
            const loginPromise = supabase.auth.signInWithPassword({
                email,
                password,
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timed out. Please check your internet or try again.')), 30000)
            );

            const { error: authError } = await Promise.race([loginPromise, timeoutPromise]);

            if (authError) {
                let msg = authError.message
                if (msg.includes('Invalid login credentials')) msg = 'Incorrect email or password'
                if (msg.includes('Email not confirmed')) msg = 'Please verify your email address'
                throw new Error(msg);
            }

            // Success
            router.refresh()
            const params = new URLSearchParams(window.location.search);
            const next = params.get('next');
            router.push(next ? decodeURIComponent(next) : '/');

        } catch (err) {
            // Error handling - ensure loading state is reset immediately
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
                    <div style={{ width: '64px', height: '64px', background: '#2a2a2a', borderRadius: '50%', margin: '0 auto', lineHeight: '64px', fontSize: '28px' }}>💪</div>
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
        </div>
    )
}
