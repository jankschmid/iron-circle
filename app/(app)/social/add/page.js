"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import Link from 'next/link';
import { useTranslation } from '@/context/TranslationContext';

export default function AddFriendPage() {
    const { user } = useStore();
    const { t } = useTranslation();
    const supabase = createClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Guard: Wait for user to be loaded
    if (!user) {
        return <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Loading...</div>;
    }

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResults([]);
        setMessage(null);

        try {
            const cleanQuery = searchQuery.trim();
            if (cleanQuery.length < 3) throw new Error("Search too short");

            // Use RPC to bypass RLS and search securely
            const { data, error } = await supabase
                .rpc('search_profiles_secure', { p_query: cleanQuery });

            if (error) throw error;

            if (!data || data.length === 0) {
                setMessage(t("User not found."));
            } else {
                setResults(data);
            }
        } catch (err) {
            console.error(err);
            setMessage(t("Error:") + " " + (err.message || t("User not found")));
        } finally {
            setLoading(false);
        }
    };

    const [requestStatus, setRequestStatus] = useState({}); // { [userId]: { status: 'idle' | 'loading' | 'success' | 'error', message: '' } }

    const sendRequest = async (targetUser) => {
        if (!targetUser) return;

        setRequestStatus(prev => ({
            ...prev,
            [targetUser.id]: { status: 'loading' }
        }));

        try {
            // Check if already friends
            // We check both directions: 'I invited them' OR 'They invited me'
            const { data: existing } = await supabase
                .from('friendships')
                .select('*')
                .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
                .maybeSingle();

            if (existing) {
                const statusMsg = existing.status === 'accepted' ? t("Already friends") : t("Request pending");
                setRequestStatus(prev => ({
                    ...prev,
                    [targetUser.id]: { status: 'success', message: statusMsg }
                }));
                return;
            }

            const { error } = await supabase
                .from('friendships')
                .insert({
                    user_id: user.id,
                    friend_id: targetUser.id,
                    status: 'pending'
                });

            if (error) throw error;

            setRequestStatus(prev => ({
                ...prev,
                [targetUser.id]: { status: 'success', message: t("Request sent!") }
            }));

        } catch (err) {
            console.error(err);
            setRequestStatus(prev => ({
                ...prev,
                [targetUser.id]: {
                    status: 'error',
                    message: (err.message || "Failed")
                }
            }));
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href="/social" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>←</Link>
                    <h1 style={{ fontSize: '1.5rem' }}>{t('Find Friends')}</h1>
                </div>
            </header>

            <div style={{ marginTop: '24px' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t("Search username or name...")}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--foreground)'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0 24px',
                            background: 'var(--primary)',
                            color: '#000',
                            borderRadius: '8px',
                            fontWeight: '600',
                            border: 'none'
                        }}
                    >
                        {t('Search')}
                    </button>
                </form>

                {message && <div style={{ marginTop: '16px', color: 'var(--text-muted)' }}>{message}</div>}

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {results.map(result => (
                        <div key={result.id} style={{
                            background: 'var(--surface)',
                            padding: '16px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img
                                    src={result.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.id}`}
                                    style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                                />
                                <div>
                                    <div style={{ fontWeight: '700' }}>{result.name} {result.id === user.id && `(${t('You')})`}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>@{result.username}</div>
                                </div>
                            </div>
                            {result.id !== user.id && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    {requestStatus[result.id]?.status === 'success' ? (
                                        <span style={{
                                            color: 'var(--primary)',
                                            fontWeight: '600',
                                            padding: '8px 16px'
                                        }}>
                                            {requestStatus[result.id].message}
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => sendRequest(result)}
                                            disabled={loading || requestStatus[result.id]?.status === 'loading'}
                                            style={{
                                                padding: '8px 16px',
                                                background: requestStatus[result.id]?.status === 'error' ? '#ff4444' : 'var(--primary)',
                                                color: '#000',
                                                borderRadius: '100px',
                                                border: 'none',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                opacity: (loading || requestStatus[result.id]?.status === 'loading') ? 0.7 : 1
                                            }}
                                        >
                                            {requestStatus[result.id]?.status === 'loading' ? '...' : (requestStatus[result.id]?.status === 'error' ? t('Retry') : t('Add +'))}
                                        </button>
                                    )}
                                    {requestStatus[result.id]?.status === 'error' && (
                                        <span style={{ fontSize: '0.8rem', color: '#ff4444', marginTop: '4px' }}>
                                            {requestStatus[result.id].message}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
