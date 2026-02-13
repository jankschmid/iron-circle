'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useTranslation } from '@/context/TranslationContext'
import LanguageSelector from '@/components/ui/LanguageSelector'

export default function SignupPage() {
    const { t } = useTranslation()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    // Fix: Singleton client
    const [supabase] = useState(() => createClient())

    const handleSignup = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            // Success! Show verification message
            setSuccess(true)
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '16px', position: 'relative' }}>

            {/* Language Selector (Top Right) */}
            <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                <LanguageSelector position="bottom-right" />
            </div>

            <div style={{
                width: '100%',
                maxWidth: '400px',
                background: 'var(--surface)',
                padding: '32px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border)'
            }}>
                {success ? (
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ color: '#ffffff', fontSize: '24px', marginBottom: '8px', fontWeight: '700' }}>{t('Iron Circle')}</h1>
                        <p style={{ color: '#a0a0a0', fontSize: '14px', marginBottom: '32px' }}>{t('Verify your account to join the leaderboard.')}</p>

                        <div style={{ width: '80px', height: '80px', background: '#2a2a2a', borderRadius: '50%', margin: '0 auto 24px auto', lineHeight: '80px', fontSize: '32px' }}>💪</div>

                        <h2 style={{ color: '#ffffff', fontSize: '18px', marginBottom: '16px', fontWeight: '600' }}>{t('Welcome to the Circle!')}</h2>
                        <p style={{ color: '#e0e0e0', fontSize: '15px', lineHeight: '1.5', marginBottom: '32px' }}>
                            {t("You're one step away from tracking your workouts and competing with friends.")}
                        </p>

                        <p style={{ color: '#666666', fontSize: '12px', marginTop: '32px', lineHeight: '1.4' }}>
                            ({t('Check your inbox at')} <strong>{email}</strong>)
                        </p>

                        <div style={{ marginTop: '24px' }}>
                            <Link href="/login" style={{ color: 'var(--brand-yellow)', fontSize: '14px', fontWeight: '600' }}>
                                {t('Back to Login')}
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <div style={{ width: '64px', height: '64px', background: '#2a2a2a', borderRadius: '50%', margin: '0 auto', lineHeight: '64px', fontSize: '28px' }}>💪</div>
                        </div>
                        <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '8px', textAlign: 'center' }}>{t('Join the Circle')}</h1>
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '32px' }}>{t('Start your journey today.')}</p>

                        {error && (
                            <div style={{ background: 'rgba(255, 23, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontSize: '0.9rem' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '500' }}>{t('Email')}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{ width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '500' }}>{t('Password')}</label>
                                <input
                                    type="password"
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
                                    color: '#000000',
                                    fontWeight: '700',
                                    fontSize: '1rem',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    opacity: loading ? 0.7 : 1,
                                    cursor: loading ? 'wait' : 'pointer'
                                }}
                            >
                                {loading ? t('Creating Account...') : t('Sign Up')}
                            </button>
                        </form>

                        <p style={{ marginTop: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {t('Already have an account?')} {' '}
                            <Link href="/login" style={{ color: 'var(--brand-yellow)', fontWeight: '600' }}>
                                {t('Sign In')}
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
