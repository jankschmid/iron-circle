"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Lock } from 'lucide-react';

const CATEGORY_META = {
    initiation: { label: 'The Initiation', color: '#60BEF2' },
    grind: { label: 'The Grind', color: '#F2A900' },
    heavy_duty: { label: 'Heavy Duty', color: '#E85D75' },
    secret: { label: 'Secret', color: '#A78BFA' },
    social: { label: 'Social & Community', color: '#4ADE80' },
};

const CATEGORY_ORDER = ['initiation', 'grind', 'heavy_duty', 'secret', 'social'];

export default function AchievementsGallery({ userId }) {
    const [achievements, setAchievements] = useState([]);
    const [unlocked, setUnlocked] = useState(new Map()); // id → unlocked_at
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        if (!userId) return;
        async function load() {
            const [{ data: all }, { data: mine }] = await Promise.all([
                supabase.from('achievements').select('*').order('xp_reward', { ascending: true }),
                supabase.from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', userId),
            ]);
            setAchievements(all || []);
            const map = new Map((mine || []).map(r => [r.achievement_id, r.unlocked_at]));
            setUnlocked(map);
            setLoading(false);
        }
        load();
    }, [userId, supabase]);

    if (loading) return (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '32px' }}>
            Loading achievements...
        </div>
    );

    const unlockedCount = unlocked.size;
    const totalCount = achievements.length;

    // Group by category
    const grouped = {};
    for (const cat of CATEGORY_ORDER) grouped[cat] = [];
    for (const a of achievements) {
        (grouped[a.category] = grouped[a.category] || []).push(a);
    }

    return (
        <div style={{ width: '100%' }}>

            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '900',
                    color: '#fff',
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    🎖️ Achievements
                </h3>
                <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    background: 'var(--surface-highlight)',
                    padding: '4px 10px',
                    borderRadius: '20px'
                }}>
                    {unlockedCount} / {totalCount}
                </span>
            </div>

            {/* Overall progress bar */}
            <div style={{
                height: '4px',
                background: 'var(--border)',
                borderRadius: '4px',
                marginBottom: '28px',
                overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%',
                    width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #FFD700, #F2A900)',
                    borderRadius: '4px',
                    transition: 'width 0.6s ease'
                }} />
            </div>

            {/* Categories */}
            {CATEGORY_ORDER.map(cat => {
                const items = grouped[cat] || [];
                if (items.length === 0) return null;
                const meta = CATEGORY_META[cat] || { label: cat, color: '#888' };
                const catUnlocked = items.filter(a => unlocked.has(a.id)).length;

                return (
                    <div key={cat} style={{ marginBottom: '28px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px'
                        }}>
                            <span style={{
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                color: meta.color,
                                textTransform: 'uppercase',
                                letterSpacing: '2px'
                            }}>
                                {meta.label}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                {catUnlocked}/{items.length}
                            </span>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '10px'
                        }}>
                            {items.map(a => {
                                const isUnlocked = unlocked.has(a.id);
                                const isHidden = a.is_hidden && !isUnlocked;

                                if (isHidden) {
                                    return (
                                        <div
                                            key={a.id}
                                            style={{
                                                aspectRatio: '1/1',
                                                background: '#0a0a0a',
                                                border: '1px solid var(--border)',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                opacity: 0.35,
                                                cursor: 'help'
                                            }}
                                            title="Secret Achievement — keep working out to discover it!"
                                        >
                                            <Lock size={20} color="var(--text-muted)" />
                                            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '1px' }}>
                                                SECRET
                                            </div>
                                        </div>
                                    );
                                }

                                const unlockedAt = unlocked.get(a.id);

                                return (
                                    <div
                                        key={a.id}
                                        onClick={() => setSelected(selected?.id === a.id ? null : a)}
                                        style={{
                                            aspectRatio: '1/1',
                                            position: 'relative',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '10px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'transform 0.15s, box-shadow 0.15s',
                                            border: isUnlocked
                                                ? `1px solid ${meta.color}55`
                                                : '1px solid var(--border)',
                                            background: isUnlocked
                                                ? `linear-gradient(135deg, #141414 0%, #1e1e1e 100%)`
                                                : '#0a0a0a',
                                            boxShadow: isUnlocked
                                                ? `0 0 12px ${meta.color}22`
                                                : 'none',
                                            filter: isUnlocked ? 'none' : 'grayscale(100%) opacity(0.5)',
                                        }}
                                    >
                                        {/* Emoji */}
                                        <div style={{ fontSize: '1.6rem', marginBottom: '6px', lineHeight: 1 }}>
                                            {a.emoji}
                                        </div>

                                        {/* Name */}
                                        <div style={{
                                            fontSize: '0.6rem',
                                            fontWeight: '700',
                                            lineHeight: '1.2',
                                            color: isUnlocked ? '#fff' : 'var(--text-muted)',
                                            marginBottom: '2px'
                                        }}>
                                            {a.name}
                                        </div>

                                        {/* XP badge */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '5px',
                                            right: '5px',
                                            fontSize: '0.5rem',
                                            fontFamily: 'monospace',
                                            color: isUnlocked ? '#FFD700' : 'var(--text-dim)',
                                            background: isUnlocked ? 'rgba(255,215,0,0.1)' : 'transparent',
                                            padding: '1px 4px',
                                            borderRadius: '4px'
                                        }}>
                                            {a.xp_reward}XP
                                        </div>

                                        {/* Unlocked indicator */}
                                        {isUnlocked && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '5px',
                                                left: '5px',
                                                fontSize: '0.55rem',
                                                color: meta.color
                                            }}>✓</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Detail popup when an achievement is tapped */}
            {selected && (
                <div
                    onClick={() => setSelected(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: '0'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '100%',
                            background: 'var(--surface)',
                            borderRadius: '20px 20px 0 0',
                            padding: '28px 24px 40px',
                            borderTop: `3px solid ${CATEGORY_META[selected.category]?.color || '#FFD700'}`
                        }}
                    >
                        <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '12px' }}>
                            {selected.emoji}
                        </div>
                        <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>
                            {selected.name}
                        </div>
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
                            {selected.description}
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '16px',
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)'
                        }}>
                            <span>🏅 {selected.xp_reward} XP Reward</span>
                            {unlocked.has(selected.id) && (
                                <span style={{ color: '#4ADE80' }}>
                                    ✓ Unlocked {new Date(unlocked.get(selected.id)).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
