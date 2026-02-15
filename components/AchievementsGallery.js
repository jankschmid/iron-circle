"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Lock, Star, Trophy, Medal, Shield } from 'lucide-react';
import { useTranslation } from '@/context/TranslationContext';

export default function AchievementsGallery({ userId }) {
    const { t } = useTranslation();
    const [achievements, setAchievements] = useState([]);
    const [unlocked, setUnlocked] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        async function loadData() {
            if (!userId) return;

            // Fetch all achievements
            const { data: allAchievements } = await supabase
                .from('achievements')
                .select('*')
                .order('xp_reward', { ascending: true }); // order by difficulty/reward

            // Fetch user's unlocked achievements
            const { data: userAchievements } = await supabase
                .from('user_achievements')
                .select('achievement_id, unlocked_at')
                .eq('user_id', userId);

            if (allAchievements) {
                setAchievements(allAchievements);
            }
            if (userAchievements) {
                const unlockedSet = new Set(userAchievements.map(ua => ua.achievement_id));
                setUnlocked(unlockedSet);
            }
            setLoading(false);
        }

        loadData();
    }, [userId, supabase]);

    if (loading) return (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', padding: '32px' }}>
            {t('Loading Dossier...')}
        </div>
    );

    return (
        <div style={{ width: '100%' }}>
            <h3 style={{
                fontSize: '1rem',
                fontWeight: '900',
                color: '#fff',
                marginBottom: '16px',
                display: 'flex',
                items: 'center',
                gap: '8px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
            }}>
                <span style={{ color: '#FFD700' }}>🎖️</span> {t('Service Record')}
            </h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px'
            }}>
                {achievements.map((achievement) => {
                    const isUnlocked = unlocked.has(achievement.id);
                    const isHidden = achievement.is_hidden && !isUnlocked;

                    if (isHidden) {
                        return (
                            <div key={achievement.id} style={{
                                aspectRatio: '1/1',
                                background: '#0a0a0a',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px',
                                opacity: 0.3,
                                cursor: 'help'
                            }} title="Secret Achievement">
                                <Lock size={24} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>CLASSIFIED</div>
                                <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', marginTop: '4px' }}>???</div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={achievement.id}
                            style={{
                                aspectRatio: '1/1',
                                position: 'relative',
                                border: isUnlocked ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid var(--border)',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '12px',
                                textAlign: 'center',
                                transition: 'all 0.2s',
                                background: isUnlocked
                                    ? 'linear-gradient(135deg, rgba(20,20,20,1) 0%, rgba(30,30,30,1) 100%)'
                                    : '#0a0a0a',
                                boxShadow: isUnlocked ? '0 0 15px rgba(255, 215, 0, 0.1)' : 'none',
                                filter: isUnlocked ? 'none' : 'grayscale(100%) opacity(0.6)'
                            }}
                        >
                            {/* Icon Placeholder */}
                            <div style={{
                                marginBottom: '8px',
                                padding: '8px',
                                borderRadius: '50%',
                                background: isUnlocked ? 'rgba(255, 215, 0, 0.1)' : 'var(--surface-highlight)',
                                color: isUnlocked ? '#FFD700' : 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <AchievementIcon iconKey={achievement.icon_key || ''} />
                            </div>

                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                lineHeight: '1.2',
                                marginBottom: '4px',
                                color: isUnlocked ? '#fff' : 'var(--text-muted)'
                            }}>
                                {achievement.name}
                            </div>

                            <div style={{
                                fontSize: '0.6rem',
                                color: 'var(--text-muted)',
                                lineHeight: '1.1',
                                padding: '0 4px',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {achievement.description}
                            </div>

                            {/* Reward Badge */}
                            <div style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                            }}>
                                <span style={{
                                    fontSize: '0.55rem',
                                    fontFamily: 'monospace',
                                    color: isUnlocked ? '#FFD700' : 'var(--text-dim)'
                                }}>
                                    {achievement.xp_reward}XP
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AchievementIcon({ iconKey }) {
    // Simple mapping for now
    if (!iconKey) return <Trophy size={20} />;

    if (iconKey.includes('bootcamp')) return <Shield size={20} />;
    if (iconKey.includes('dawn')) return <Star size={20} />;
    if (iconKey.includes('night')) return <Star size={20} />;
    if (iconKey.includes('friend') || iconKey.includes('squad')) return <Trophy size={20} />;
    if (iconKey.includes('titan')) return <Medal size={20} />;
    if (iconKey.includes('officer')) return <Medal size={20} />;

    return <Trophy size={20} />;
}
