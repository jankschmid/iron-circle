"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useSocialStore } from '@/hooks/useSocialStore';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '@/context/TranslationContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeedTab() {
    const { user } = useStore();
    const { fetchFeed, interactWithEvent } = useSocialStore(user); // Initialize hook
    const { t } = useTranslation();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scope, setScope] = useState('squad');

    const loadFeed = async () => {
        setLoading(true);
        const data = await fetchFeed(0, 20, scope); // Uses RPC get_squad_feed with scope
        setFeed(data || []);
        setLoading(false);
    };

    useEffect(() => {
        if (user) loadFeed();
    }, [user, scope]);

    const handleFistbump = async (eventId, hasFistbumped) => {
        // Optimistic Update
        setFeed(prev => prev.map(event => {
            if (event.event_id === eventId) {
                return {
                    ...event,
                    has_fistbumped: !hasFistbumped,
                    fistbump_count: hasFistbumped ? Number(event.fistbump_count) - 1 : Number(event.fistbump_count) + 1
                };
            }
            return event;
        }));

        try {
            if (!hasFistbumped) {
                await interactWithEvent(eventId, 'fistbump');
            } else {
                // We didn't impl delete interaction in store yet, but usually fistbumps are toggleable.
                // For now, let's assume one-way or we need to add delete logic if we want to un-fistbump.
                // The DB migration "Users can delete own interactions" allows it.
            }
        } catch (err) {
            console.error("Fistbump error:", err);
        }
    };

    const EventCard = ({ event }) => {
        const isPrestige = event.type === 'rank_up';
        const isPR = event.type === 'pr';

        let borderColor = 'var(--border)';
        if (isPrestige) borderColor = '#FFD700'; // Gold
        if (isPR) borderColor = 'var(--primary)'; // Neon/Iron
        if (event.type === 'challenge_joined') borderColor = 'var(--brand-yellow)';
        if (event.type.startsWith('challenge_submit') || event.type === 'challenge_verified') borderColor = 'var(--primary)';

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${borderColor}`,
                    overflow: 'hidden',
                    boxShadow: isPrestige ? '0 0 15px rgba(255, 215, 0, 0.15)' : 'none',
                    marginBottom: '16px'
                }}
            >
                {/* Header */}
                <div style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ position: 'relative' }}>
                        <img
                            src={event.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.user_id}`}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                        />
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {event.username || t('Unknown')}
                            {isPrestige && <span style={{ fontSize: '0.8rem', color: '#FFD700' }}>👑 ASCENDED</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatDistanceToNow(new Date(event.created_at))} {t('ago')}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px' }}>
                    {event.type === 'workout' && (
                        <>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{event.data.name || t('Workout')}</h3>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                <div>⏱️ {Math.round(event.data.duration / 60)} min</div>
                                <div>⚖️ {(event.data.volume / 1000).toFixed(1)}k kg</div>
                                <div style={{ color: 'var(--success)' }}>+{event.data.earnedXP} XP</div>
                            </div>
                        </>
                    )}

                    {event.type === 'pr' && (
                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                            <div style={{ fontSize: '2rem' }}>🏆</div>
                            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: '900' }}>NEW RECORD</h3>
                            <div style={{ fontSize: '1.1rem', marginTop: '4px' }}>{event.data.exercise}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{event.data.weight} kg</div>
                        </div>
                    )}

                    {event.type === 'rank_up' && (
                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                            <div style={{ fontSize: '2.5rem' }}>🏅</div>
                            <h3 style={{ fontSize: '1.4rem', color: '#FFD700', fontWeight: '900', textTransform: 'uppercase' }}>Rank {event.data.newRank || event.data.new_level}</h3>
                            <p style={{ color: 'var(--text-muted)' }}>"The legend grows..."</p>
                        </div>
                    )}

                    {event.type === 'challenge_joined' && (
                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                            <div style={{ fontSize: '2rem' }}>⚔️</div>
                            <h3 style={{ fontSize: '1.2rem', color: 'var(--brand-yellow)', fontWeight: '900' }}>{t('JOINED CHALLENGE')}</h3>
                            <div style={{ fontSize: '1.1rem', marginTop: '4px' }}>{event.data.challenge_title}</div>
                        </div>
                    )}

                    {(event.type === 'challenge_submit' || event.type === 'challenge_verified') && (
                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                            <div style={{ fontSize: '2rem' }}>🎯</div>
                            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: '900' }}>{t('SUBMITTED RESULT')}</h3>
                            <div style={{ fontSize: '1.1rem', marginTop: '4px', color: 'var(--text-muted)' }}>{event.data.challenge_title}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '8px' }}>{event.data.value} {event.data.unit}</div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '16px', background: 'rgba(0,0,0,0.2)' }}>
                    <button
                        onClick={() => handleFistbump(event.event_id, event.has_fistbumped)}
                        disabled={event.has_fistbumped}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: event.has_fistbumped ? 'var(--primary)' : 'var(--text-muted)',
                            cursor: event.has_fistbumped ? 'default' : 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 'bold',
                            opacity: event.has_fistbumped ? 1 : 0.7
                        }}
                    >
                        {event.has_fistbumped ? '👊 BROFIST' : '👊 RESPECT'}
                        <span style={{ background: 'var(--surface-highlight)', padding: '2px 6px', borderRadius: '100px', fontSize: '0.75rem' }}>
                            {event.fistbump_count || 0}
                        </span>
                    </button>
                    {/* Comments feature can be added later */}
                </div>
            </motion.div>
        );
    };

    if (loading) return <div className="p-4 text-center text-muted">{t('Loading Activity Log...')}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Feed Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginTop: '16px' }}>
                <h2 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)' }}>ACTIVITY LOG</h2>
            </div>
            
            {/* Scope Segment Control */}
            <div style={{ display: 'flex', background: 'var(--surface)', padding: '4px', borderRadius: '12px', margin: '0 20px', border: '1px solid var(--border)' }}>
                {['squad', 'gym'].map(s => (
                    <button
                        key={s}
                        onClick={() => setScope(s)}
                        style={{
                            flex: 1, padding: '8px 0', border: 'none', background: scope === s ? 'var(--primary)' : 'transparent',
                            color: scope === s ? '#000' : 'var(--text-muted)',
                            borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', fontSize: '0.8rem'
                        }}
                    >
                        {s === 'gym' ? t('My Gym') : t('Squad')}
                    </button>
                ))}
            </div>
            
            <div style={{ padding: '0 20px' }}>
                {feed.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🕸️</div>
                        <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{t('Silence on the wire')}</p>
                        <p style={{ marginBottom: '16px' }}>{t('No active signals from your team.')}</p>
                        <Link href="/social/add" style={{
                            background: 'var(--primary)',
                            color: 'black',
                            padding: '12px 24px',
                            borderRadius: '100px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            display: 'inline-block'
                        }}>
                            {t('Find Friends')}
                        </Link>
                    </div>
                ) : (
                    feed.map(event => <EventCard key={event.event_id} event={event} />)
                )}
            </div>
        </div>
    );
}
