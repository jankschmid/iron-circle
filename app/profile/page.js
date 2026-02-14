"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import WorkoutHeatmap from '@/components/WorkoutHeatmap';
import { getLevelProgress, checkPrestigeEligible } from '@/lib/gamification';
import { useTranslation } from '@/context/TranslationContext';
import PrestigeModal from '@/components/PrestigeModal';
import StatsTab from '@/components/StatsTab';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
    const { t } = useTranslation();
    const { user, getWeeklyStats, getPersonalBests, gyms, friends, history } = useStore();
    const router = useRouter();
    const [supabase] = useState(() => createClient());
    const [isLongLoading, setIsLongLoading] = useState(false);
    const [showPrestige, setShowPrestige] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!user) {
                setIsLongLoading(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [user]);

    if (!user) {
        if (isLongLoading) {
            return (
                <div style={{
                    minHeight: '100vh',
                    background: 'var(--background)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '24px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--foreground)' }}>{t('Connection Issue')}</h2>
                        <p>{t("We're having trouble loading your data.")}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', width: '100%', maxWidth: '300px' }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                color: '#000',
                                background: 'var(--primary)',
                                border: 'none',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {t('Retry Connection')}
                        </button>
                        <button
                            onClick={async () => {
                                supabase.auth.signOut().catch(err => console.error("Sign out ignored:", err));
                                localStorage.clear();
                                sessionStorage.clear();
                                window.location.href = '/login';
                            }}
                            style={{
                                color: 'var(--text-muted)',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer'
                            }}
                        >
                            {t('Log Out & Reset')}
                        </button>
                    </div>
                </div>
            );
        }
        return (
            <div style={{
                minHeight: '100vh',
                background: 'var(--background)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className="spinner"></div>
                    <p>{t('Syncing...')}</p>
                </div>
                <style jsx>{`
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid var(--surface-highlight);
                        border-top: 4px solid var(--primary);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    const { totalWorkouts, totalVolume } = getWeeklyStats();
    const personalBests = getPersonalBests();

    // Gamification
    const levelData = getLevelProgress(user.current_xp || user.xp || 0);
    const { totalNeeded } = levelData;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Prestige Logic
    console.log("Prestige Check -> Level:", user.level, "XP:", user.current_xp, "Prestige:", user.prestige_level);
    const prestigeStatus = checkPrestigeEligible(user.level || 1, user.prestige_level || 0);
    const isMaxPrestige = (user.prestige_level || 0) >= 12;

    const handlePrestigeConfirm = async () => {
        const newPrestige = (user.prestige_level || 0) + 1;
        const { error } = await supabase
            .from('profiles')
            .update({
                level: 1,
                current_xp: 0,
                prestige_level: newPrestige
            })
            .eq('id', user.id);

        if (error) {
            console.error("Prestige Error:", error);
        } else {
            setShowPrestige(false);
            window.location.reload();
        }
    };

    const userGym = (gyms || []).find(g => g.id === user.gymId);

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <div style={{ padding: '24px 0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <img
                        src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id || 'guest'}`}
                        style={{
                            width: '96px',
                            height: '96px',
                            borderRadius: '50%',
                            border: '3px solid var(--primary)',
                            objectFit: 'cover'
                        }}
                    />
                    {user.prestige_level > 0 && (
                        <div style={{
                            position: 'absolute',
                            bottom: '-8px',
                            right: '-8px',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                        }}>
                            <img
                                src={`/assets/prestige/Prestige_${String(user.prestige_level).padStart(2, '0')}.png`}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.8))'
                                }}
                                onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                        </div>
                    )}
                </div>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{user.name}</h1>
                <p style={{ color: 'var(--text-muted)' }}>{user.handle || '@athlete'}</p>
                {userGym && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                        <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--primary)',
                            background: 'var(--primary-dim)',
                            padding: '4px 12px',
                            borderRadius: '100px',
                            display: 'inline-block'
                        }}>
                            📍 {userGym.name}
                        </div>
                        {userGym.role === 'owner' && (
                            <div style={{ background: '#FFD700', color: '#000', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                👑 {t('Owner')}
                            </div>
                        )}
                        {userGym.role === 'admin' && (
                            <div style={{ background: 'var(--error)', color: '#fff', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                🛡️ {t('Admin')}
                            </div>
                        )}
                        {userGym.role === 'trainer' && (
                            <div style={{ background: 'var(--brand-yellow)', color: '#000', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                💪 {t('Trainer')}
                            </div>
                        )}
                        {(userGym.role === 'member' || !userGym.role) && (
                            <div style={{ background: 'var(--surface-highlight)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid var(--border)' }}>
                                👤 {t('Member')}
                            </div>
                        )}
                    </div>
                )}


                {/* Level Progress */}
                <div style={{ width: '100%', maxWidth: '280px', margin: '16px 0 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>{t('Level')}</span>
                            <span style={{ fontSize: '2rem', lineHeight: '1', fontWeight: '900', color: '#fff' }}>{user.level || 1}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700' }}>
                                {Math.floor(user.current_xp || 0)} <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>/ {totalNeeded} XP</span>
                            </span>
                        </div>
                    </div>

                    {/* Progress Track */}
                    <div style={{
                        width: '100%',
                        height: '10px',
                        background: 'var(--surface-border)',
                        borderRadius: '100px',
                        overflow: 'hidden',
                        position: 'relative',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        {/* Progress Fill */}
                        <div style={{
                            width: `${Math.min((user.current_xp / totalNeeded) * 100, 100)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--primary-dim), var(--primary))',
                            transition: 'width 0.5s ease',
                            borderRadius: '100px',
                            boxShadow: '0 0 10px var(--primary-glow)'
                        }} />
                    </div>
                </div>

                {/* DEV TOOLS - ONLY VISIBLE TO OWNER */}
                {(user.is_super_admin || user.email === 'janschad04@gmail.com') && (
                    <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
                        <h4 style={{ color: '#666', fontSize: '0.8rem', marginBottom: '10px' }}>DEVELOPER TOOLS</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button
                                onClick={async () => {
                                    console.log("Setting Level 50 for user:", user.id);
                                    const { error } = await supabase.from('profiles').update({ level: 50, current_xp: 50000, lifetime_xp: 50000 }).eq('id', user.id);
                                    if (error) {
                                        console.error("Error setting level:", error);
                                        alert("Error: " + JSON.stringify(error));
                                    } else {
                                        alert('Set to Level 50! Refreshing...');
                                        window.location.reload();
                                    }
                                }}
                                style={{ padding: '8px', background: '#333', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                                Set Lvl 50
                            </button>
                            <button
                                onClick={async () => {
                                    console.log("Resetting user:", user.id);
                                    // Reset LIFETIME too
                                    const { error } = await supabase.from('profiles').update({
                                        level: 1,
                                        current_xp: 0,
                                        lifetime_xp: 0,
                                        prestige_level: 0
                                    }).eq('id', user.id);

                                    if (error) {
                                        console.error("Error resetting:", error);
                                        alert("Error: " + JSON.stringify(error));
                                    } else {
                                        alert('Reset complete! Refreshing...');
                                        window.location.reload();
                                    }
                                }}
                                style={{ padding: '8px', background: '#333', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                                Reset All
                            </button>
                            <button
                                onClick={async () => {
                                    console.log("Adding XP for user:", user.id);
                                    // Add 500 XP to LIFETIME (Source of Truth)
                                    const oldLifetime = user.lifetime_xp || 0;
                                    const newLifetime = oldLifetime + 500;

                                    const levelData = getLevelProgress(newLifetime);
                                    const newLevel = levelData.currentLevel;
                                    const newCurrentXP = levelData.progress; // The bar progress

                                    console.log(`XP Update: ${oldLifetime} -> ${newLifetime} | Level: ${user.level} -> ${newLevel}`);

                                    const { error } = await supabase.from('profiles').update({
                                        lifetime_xp: newLifetime,
                                        current_xp: newCurrentXP,
                                        level: newLevel
                                    }).eq('id', user.id);

                                    if (error) {
                                        console.error("Error adding XP:", error);
                                        alert("Error: " + JSON.stringify(error));
                                    } else {
                                        alert(`+500 XP Added! (Total: ${newLifetime}, Lvl ${newLevel}) Refreshing...`);
                                        window.location.reload();
                                    }
                                }}
                                style={{ padding: '8px', background: '#333', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                                +500 XP
                            </button>
                            <button
                                onClick={async () => {
                                    console.log("Syncing Level for user:", user.id);
                                    // Use LIFETIME XP
                                    const totalXP = user.lifetime_xp || 0;
                                    const levelData = getLevelProgress(totalXP);
                                    const correctLevel = levelData.currentLevel;
                                    const correctCurrentXP = levelData.progress;

                                    if (user.level === correctLevel) {
                                        // Even if level is correct, check if current_xp (bar) matches
                                        if (user.current_xp === correctCurrentXP) {
                                            alert(`Level & XP already correct (Lvl ${correctLevel}).`);
                                            return;
                                        }
                                    }

                                    const { error } = await supabase.from('profiles').update({
                                        level: correctLevel,
                                        current_xp: correctCurrentXP
                                    }).eq('id', user.id);

                                    if (error) {
                                        console.error("Error syncing level:", error);
                                        alert("Error: " + JSON.stringify(error));
                                    } else {
                                        alert(`Synced! Lifetime: ${totalXP} -> Lvl ${correctLevel}. Refreshing...`);
                                        window.location.reload();
                                    }
                                }}
                                style={{ padding: '8px', background: '#333', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', gridColumn: 'span 2' }}
                            >
                                Sync Level
                            </button>
                        </div>
                    </div>
                )}

                {/* Prestige Badge & Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                    {/* Badge */}
                    {(user.prestige_level > 0) && (
                        <div style={{ marginBottom: '8px' }}>
                            <img
                                src={`/assets/prestige/Prestige_${String(user.prestige_level).padStart(2, '0')}.png`}
                                alt={`Prestige ${user.prestige_level}`}
                                style={{ width: '64px', height: '64px', filter: 'drop-shadow(0 0 10px rgba(255,0,0,0.5))' }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none'; // Hide if missing
                                }}
                            />
                            <div style={{ fontSize: '0.8rem', color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
                                Prestige {user.prestige_level}
                            </div>
                        </div>
                    )
                    }

                    {/* Ascension Button */}
                    {/* Prestige Button (Always Visible) */}
                    {!isMaxPrestige && (
                        <button
                            onClick={() => setShowPrestige(true)}
                            style={{
                                background: prestigeStatus.eligible
                                    ? 'linear-gradient(45deg, #ff0000, #ff4444)'
                                    : 'transparent',
                                color: prestigeStatus.eligible ? '#fff' : 'var(--text-dim)',
                                border: prestigeStatus.eligible
                                    ? 'none'
                                    : '1px solid var(--text-dim)',
                                padding: '10px 20px',
                                borderRadius: '100px',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                boxShadow: prestigeStatus.eligible
                                    ? '0 0 20px rgba(255, 0, 0, 0.6)'
                                    : 'none',
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                animation: prestigeStatus.eligible ? 'pulse 2s infinite' : 'none',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {prestigeStatus.eligible ? '🔥 ' + t('ENTER PRESTIGE') : `🔒 ${t('Prestige Rank')} ${user.prestige_level + 1}`}
                        </button>
                    )}

                    {
                        isMaxPrestige && (user.level === 50) && (
                            <div style={{
                                background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                                color: '#000',
                                padding: '8px 16px',
                                borderRadius: '100px',
                                fontWeight: 'bold',
                                boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)'
                            }}>
                                {t('MAX RANK ACHIEVED')}
                            </div>
                        )
                    }
                </div>


                <div style={{
                    marginTop: '8px',
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '100px',
                    background: 'var(--surface-highlight)',
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem',
                    color: 'var(--text-dim)',
                    marginBottom: '16px'
                }}>
                    🎯 {t('Focus')}: <span style={{ color: 'var(--foreground)', fontWeight: 'bold' }}>{user.goal || 'Muscle'}</span>
                </div>

                {user.bio && <p style={{ fontSize: '0.9rem', maxWidth: '300px', textAlign: 'center', color: 'var(--text-muted)' }}>{user.bio}</p>}

                <PrestigeModal
                    isOpen={showPrestige}
                    onClose={() => setShowPrestige(false)}
                    pendingLevel={user.level}
                    onConfirm={handlePrestigeConfirm}
                />

                <div style={{ marginTop: '16px', display: 'flex', gap: '24px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{totalWorkouts}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Workouts')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{(totalVolume / 1000).toFixed(1)}k</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Volume')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{friends?.length || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('Friends')}</div>
                    </div>
                </div>
            </div>

            {/* TABS INITIALIZATION */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'overview' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'overview' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    {t('Overview')}
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'stats' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'stats' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    {t('Statistics')}
                </button>
            </div>

            {activeTab === 'overview' ? (
                <>
                    <section style={{ marginBottom: '32px' }}>
                        <WorkoutHeatmap history={history} />
                    </section>

                    <section style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>{t('Personal Bests')}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {personalBests.map((pb) => (
                                <div key={pb.name} style={{
                                    background: 'var(--surface)',
                                    padding: '16px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>{pb.name}</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary)' }}>{pb.weight}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>{pb.date}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            ) : (
                <StatsTab />
            )}

            <section>
                {/* Settings & Notifications Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <Link href="/profile/settings" style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: 'var(--surface)',
                            padding: '24px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            height: '100%'
                        }}>
                            <div style={{ fontSize: '1.8rem' }}>⚙️</div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{t('Settings')}</div>
                        </div>
                    </Link>

                    <Link href="/profile/notifications" style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: 'var(--surface)',
                            padding: '24px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            height: '100%'
                        }}>
                            <div style={{ fontSize: '1.8rem' }}>🔔</div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{t('Notifications')}</div>
                        </div>
                    </Link>
                </div>

                {/* Role Based Access */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(user.is_super_admin) && (
                        <Link href="/admin/master" style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '16px',
                                background: 'rgba(255, 0, 0, 0.1)',
                                border: '1px solid #ff4444',
                                borderRadius: 'var(--radius-md)',
                                color: '#ff4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontWeight: 'bold'
                            }}>
                                <span>⚡</span> {t('Master Admin Panel')}
                            </div>
                        </Link>
                    )}

                    {(userGym?.role === 'trainer' || userGym?.role === 'admin' || userGym?.role === 'owner') && (
                        <Link href={`/trainer/dashboard?gymId=${userGym.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '16px',
                                background: 'rgba(255, 200, 0, 0.1)',
                                border: '1px solid #FFC800',
                                borderRadius: 'var(--radius-md)',
                                color: '#FFC800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontWeight: 'bold'
                            }}>
                                <span>📋</span> {t('Coach Panel')}
                            </div>
                        </Link>
                    )}

                    {(userGym?.role === 'admin' || userGym?.role === 'owner') && (
                        <Link href={`/gym/admin?id=${userGym.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '16px',
                                background: 'rgba(50, 50, 200, 0.15)',
                                border: '1px solid #4488ff',
                                borderRadius: 'var(--radius-md)',
                                color: '#4488ff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontWeight: 'bold'
                            }}>
                                <span>🏢</span> {t('Gym Admin Dashboard')}
                            </div>
                        </Link>
                    )}

                    <button onClick={handleLogout} style={{
                        width: '100%',
                        padding: '16px',
                        background: 'transparent',
                        color: 'var(--error)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        {t('Sign Out')}
                    </button>
                </div>
            </section>

            <BottomNav />
        </div >
    );
}
