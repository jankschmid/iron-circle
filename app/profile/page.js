"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import WorkoutHeatmap from '@/components/WorkoutHeatmap';
import { getLevelProgress, checkPrestigeEligible, XP_TO_LEVEL_100 } from '@/lib/gamification';
import { useTranslation } from '@/context/TranslationContext';
import PrestigeModal from '@/components/PrestigeModal';
import StatsTab from '@/components/StatsTab';
import AchievementsGallery from '@/components/AchievementsGallery';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
    const { t } = useTranslation();
    const { user, setUser, getWeeklyStats, getPersonalBests, gyms, friends, history } = useStore();
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

    // Gamification - Use CYCLE XP for level progress
    // Fallback to capped lifetime if cycle_xp missing (migration overlap)
    const effectiveCycleXP = (user.cycle_xp !== undefined && user.cycle_xp !== null)
        ? user.cycle_xp
        : Number(user.lifetime_xp || 0);

    const levelData = getLevelProgress(effectiveCycleXP);
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
        // CLIENT-SIDE PRESTIGE LOGIC (For Static Export)
        // Replicates app/actions/gamification.js logic
        try {
            // 1. Fetch Fresh Profile Data
            const { data: profile, error: freshError } = await supabase
                .from("profiles")
                .select("level, prestige_level, xp_overflow, cycle_xp, lifetime_xp")
                .eq("id", user.id)
                .single();

            if (freshError) throw new Error("Could not verify profile");

            // 2. Validate Level 100 Cap
            const currentCycleXP = profile.cycle_xp !== undefined ? profile.cycle_xp : (profile.prestige_level > 0 ? 0 : profile.lifetime_xp); // Robust fallback
            // const XP_REQ = 534600; // Hardcoded fallback or import
            const XP_REQ = XP_TO_LEVEL_100;

            if (currentCycleXP < XP_REQ) {
                return { error: `Must reach Level 100 (${XP_REQ.toLocaleString()} XP) to Ascend!` };
            }

            // 3. Prepare New Values
            const newPrestigeLevel = (profile.prestige_level || 0) + 1;
            const excessXP = Math.max(0, currentCycleXP - XP_REQ);
            const oldOverflow = profile.xp_overflow || 0;
            const headStartXP = excessXP + oldOverflow;

            // Recalculate level
            const { currentLevel, progress } = getLevelProgress(headStartXP);

            // 4. ATOMIC UPDATE (RLS must allow this)
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    prestige_level: newPrestigeLevel,
                    cycle_xp: headStartXP,
                    level: currentLevel,
                    current_xp: progress,
                    xp_overflow: 0
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Success! Update local state
            setUser({
                ...user,
                prestige_level: newPrestigeLevel,
                level: currentLevel,
                current_xp: 0, // Visual reset (will animate up)
                cycle_xp: headStartXP,
                xp_overflow: 0
            });

            return {
                success: true,
                newLevel: currentLevel,
                newPrestigeLevel: newPrestigeLevel,
                headStartXP: headStartXP
            };

        } catch (e) {
            console.error(e);
            return { error: e.message };
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
                            bottom: '-5px',
                            right: '-5px',
                            width: '40px',
                            height: '40px',
                            zIndex: 10,
                            background: '#000',
                            borderRadius: '50%',
                            padding: '4px',
                            border: '2px solid #fff', // White border like PB
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                        }}>
                            <img
                                src={`/assets/prestige/Prestige_${String(user.prestige_level).padStart(2, '0')}.png`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
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
                            color: '#000', // Dark text for readability on dim background
                            background: 'var(--primary-dim)',
                            padding: '4px 12px',
                            fontWeight: 'bold',
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
                            <span style={{ fontSize: '2rem', lineHeight: '1', fontWeight: '900', color: levelData.isMaxLevel ? '#FFD700' : '#fff' }}>
                                {levelData.isMaxLevel ? 'MAX' : (user.level || 1)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.8rem', color: levelData.isMaxLevel ? '#FFD700' : 'var(--primary)', fontWeight: '700' }}>
                                {levelData.isMaxLevel ? (
                                    'MAX LEVEL'
                                ) : (
                                    <>
                                        {Math.floor(levelData.progress || 0)} <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>/ {totalNeeded} XP</span>
                                    </>
                                )}
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
                            width: `${levelData.isMaxLevel ? 100 : Math.min((user.current_xp / totalNeeded) * 100, 100)}%`,
                            height: '100%',
                            background: levelData.isMaxLevel
                                ? 'linear-gradient(90deg, #FFD700, #FFA500)'
                                : 'linear-gradient(90deg, var(--primary-dim), var(--primary))',
                            transition: 'width 0.5s ease',
                            borderRadius: '100px',
                            boxShadow: levelData.isMaxLevel
                                ? '0 0 15px rgba(255, 215, 0, 0.6)'
                                : '0 0 10px var(--primary-glow)'
                        }} />
                    </div>

                    {/* Overflow Display */}
                    {/* Endless Mode: Stored Energy (Overflow) */}
                    {/* Head Start Display (For Level 100+) - HIDDEN AT MAX PRESTIGE */}
                    {effectiveCycleXP > XP_TO_LEVEL_100 && !isMaxPrestige && (
                        <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: 'rgba(255, 215, 0, 0.05)',
                            border: '1px solid rgba(255, 215, 0, 0.3)',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Glowing Background Effect */}
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'radial-gradient(circle, rgba(255,215,0,0.1) 0%, rgba(0,0,0,0) 70%)',
                                animation: 'pulse-glow 3s infinite ease-in-out'
                            }} />

                            <span style={{ fontSize: '0.7rem', color: '#FFD700', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', zIndex: 1 }}>
                                {t('Next Prestige Head Start')}
                            </span>
                            <div style={{
                                fontSize: '1.2rem',
                                color: '#FFD700',
                                fontWeight: '900',
                                textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
                                zIndex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                ⚡ +{Math.max(0, Math.floor(effectiveCycleXP - XP_TO_LEVEL_100) + Number(user.xp_overflow || 0)).toLocaleString()} XP
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', zIndex: 1 }}>
                                {t('Banked for your next journey')}
                            </div>
                        </div>
                    )}
                </div>

                {/* Prestige Button - Always Visible/Clickable now */}


                {/* DEV TOOLS - ONLY VISIBLE TO OWNER */}
                {/* DEV TOOLS - ONLY VISIBLE TO OWNER */}
                {(user.is_super_admin || user.email === 'janschad04@gmail.com') && (
                    <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
                        <h4 style={{ color: '#666', fontSize: '0.8rem', marginBottom: '10px' }}>DEVELOPER TOOLS (OPTIMIZED)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button
                                onClick={async () => {
                                    const targetXP = XP_TO_LEVEL_100;
                                    const levelData = getLevelProgress(targetXP);

                                    // 1. Optimistic Update
                                    setUser({
                                        ...user,
                                        level: 100,
                                        current_xp: levelData.progress,
                                        lifetime_xp: targetXP,
                                        cycle_xp: targetXP,
                                        xp_overflow: 0
                                    });

                                    // 2. Background Sync
                                    const { error } = await supabase.from('profiles').update({
                                        level: 100,
                                        current_xp: levelData.progress,
                                        lifetime_xp: targetXP,
                                        cycle_xp: targetXP,
                                        xp_overflow: 0
                                    }).eq('id', user.id);

                                    if (error) {
                                        console.error("Dev Tool Error:", error);
                                        alert("Sync failed");
                                    } else {
                                        router.refresh(); // Soft refresh
                                    }
                                }}
                                style={{ padding: '8px', background: '#333', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                                Set Lvl 100
                            </button>
                            <button
                                onClick={async () => {
                                    const targetXP = XP_TO_LEVEL_100 + 55000; // ~Level 105
                                    const levelData = getLevelProgress(targetXP);

                                    setUser({
                                        ...user,
                                        level: 105,
                                        current_xp: levelData.progress,
                                        lifetime_xp: targetXP,
                                        cycle_xp: targetXP,
                                        xp_overflow: 0
                                    });

                                    const { error } = await supabase.from('profiles').update({
                                        level: 105,
                                        current_xp: levelData.progress,
                                        lifetime_xp: targetXP,
                                        cycle_xp: targetXP,
                                        xp_overflow: 0
                                    }).eq('id', user.id);

                                    if (!error) router.refresh();
                                }}
                                style={{ padding: '8px', background: '#333', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                                Set Lvl 105
                            </button>
                            <button
                                onClick={async () => {
                                    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                                    if (error) alert("Error: " + error.message);
                                    else alert("DB STATE:\n" + JSON.stringify({
                                        lvl: data.level,
                                        cyc: data.cycle_xp,
                                        life: data.lifetime_xp,
                                        over: data.xp_overflow,
                                        pres: data.prestige_level
                                    }, null, 2));
                                }}
                                style={{ padding: '8px', background: '#440000', border: '1px solid red', color: '#fff', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                                🔍 CHECK DB
                            </button>
                            <button
                                onClick={async () => {
                                    // Reset LIFETIME too
                                    setUser({
                                        ...user,
                                        level: 1,
                                        current_xp: 0,
                                        lifetime_xp: 0,
                                        cycle_xp: 0,
                                        prestige_level: 0,
                                        xp_overflow: 0
                                    });

                                    const { error } = await supabase.from('profiles').update({
                                        level: 1,
                                        current_xp: 0,
                                        lifetime_xp: 0,
                                        cycle_xp: 0,
                                        prestige_level: 0,
                                        xp_overflow: 0
                                    }).eq('id', user.id);

                                    if (!error) router.refresh();
                                }}
                                style={{ padding: '8px', background: '#333', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                                Reset All
                            </button>
                            <button
                                onClick={async () => {
                                    const oldCycle = Number(user.cycle_xp || 0);
                                    const oldLifetime = Number(user.lifetime_xp || 0);
                                    const newLifetime = oldLifetime + 500;
                                    const newCycle = oldCycle + 500;

                                    const levelData = getLevelProgress(newCycle); // Use Cycle XP for level!
                                    const newLevel = levelData.currentLevel;
                                    const newCurrentXP = levelData.progress;

                                    setUser({
                                        ...user,
                                        lifetime_xp: newLifetime,
                                        current_xp: newCurrentXP,
                                        level: newLevel,
                                        cycle_xp: newCycle
                                    });

                                    const { error } = await supabase.from('profiles').update({
                                        lifetime_xp: newLifetime,
                                        current_xp: newCurrentXP,
                                        level: newLevel,
                                        cycle_xp: newCycle
                                    }).eq('id', user.id);

                                    if (!error) router.refresh();
                                }}
                                style={{ padding: '8px', background: '#333', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                                +500 XP
                            </button>
                            <button
                                onClick={async () => {
                                    const oldCycle = Number(user.cycle_xp || 0);
                                    const oldLifetime = Number(user.lifetime_xp || 0);
                                    const newLifetime = oldLifetime + 50000;
                                    const newCycle = oldCycle + 50000;

                                    const levelData = getLevelProgress(newCycle);
                                    const newLevel = levelData.currentLevel;
                                    const newCurrentXP = levelData.progress;

                                    setUser({
                                        ...user,
                                        lifetime_xp: newLifetime,
                                        current_xp: newCurrentXP,
                                        level: newLevel,
                                        cycle_xp: newCycle
                                    });

                                    const { error } = await supabase.from('profiles').update({
                                        lifetime_xp: newLifetime,
                                        current_xp: newCurrentXP,
                                        level: newLevel,
                                        cycle_xp: newCycle
                                    }).eq('id', user.id);

                                    if (!error) router.refresh();
                                }}
                                style={{ padding: '8px', background: '#222', border: '1px solid #444', color: '#4caf50', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                +50k XP
                            </button>
                            <button
                                onClick={async () => {
                                    // SYNC LEVEL: Uses Cycle XP as truth
                                    const xpTruth = Number(user.cycle_xp || 0);
                                    // Fallback only if Rank 0 and cycle is 0
                                    // const xpTruth = (user.prestige_level > 0 || user.cycle_xp) ? user.cycle_xp : user.lifetime_xp; 

                                    const levelData = getLevelProgress(xpTruth);
                                    const correctLevel = levelData.currentLevel;
                                    const correctCurrentXP = levelData.progress;

                                    if (user.level !== correctLevel || user.current_xp !== correctCurrentXP) {
                                        setUser({
                                            ...user,
                                            level: correctLevel,
                                            current_xp: correctCurrentXP
                                        });

                                        await supabase.from('profiles').update({
                                            level: correctLevel,
                                            current_xp: correctCurrentXP
                                        }).eq('id', user.id);

                                        router.refresh();
                                    }
                                }}
                                style={{ padding: '8px', background: '#333', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', gridColumn: 'span 2' }}
                            >
                                Sync Level
                            </button>
                        </div>
                    </div>
                )}

                {/* Prestige Status Card (Always Visible) */}
                <div style={{
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'var(--surface)',
                    padding: '24px 32px',
                    borderRadius: '24px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    width: '100%',
                    maxWidth: '280px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Title */}
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '12px',
                        fontWeight: 'bold'
                    }}>
                        {user.prestige_level > 0 ? t('Current Rank') : t('Next Rank')}
                    </span>

                    {/* Icon Display */}
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <img
                            src={`/assets/prestige/Prestige_${String(user.prestige_level || 1).padStart(2, '0')}.png`}
                            alt={`Prestige ${user.prestige_level || 1}`}
                            style={{
                                width: '100px',
                                height: '100px',
                                filter: user.prestige_level > 0 ? 'drop-shadow(0 0 15px rgba(255,215,0,0.4))' : 'blur(4px) grayscale(1) opacity(0.5)',
                                transition: 'all 0.3s ease'
                            }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                            }}
                        />
                        {/* Zero State Lock Overlay */}
                        {user.prestige_level === 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '2rem'
                            }}>
                                🔒
                            </div>
                        )}
                    </div>

                    {/* Rank Name */}
                    <div style={{
                        fontSize: '1.4rem',
                        color: user.prestige_level > 0 ? '#FFD700' : 'var(--text-dim)',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: '900',
                        marginBottom: '16px',
                        textShadow: user.prestige_level > 0 ? '0 0 10px rgba(255,215,0,0.3)' : 'none'
                    }}>
                        Prestige {user.prestige_level || 1}
                    </div>

                    {/* Action Button */}
                    {!isMaxPrestige && (
                        <button
                            onClick={() => setShowPrestige(true)}
                            disabled={user.prestige_level > 0 && !levelData.isPrestigeReady}
                            style={{
                                background: levelData.isPrestigeReady
                                    ? 'linear-gradient(45deg, #FFD700, #FFA500)'
                                    : 'rgba(255,255,255,0.05)',
                                color: levelData.isPrestigeReady ? '#000' : 'var(--text-dim)',
                                border: levelData.isPrestigeReady
                                    ? 'none'
                                    : '1px solid var(--border)',
                                padding: '12px 24px',
                                borderRadius: '100px',
                                fontWeight: '800',
                                fontSize: '0.85rem',
                                boxShadow: levelData.isPrestigeReady
                                    ? '0 4px 15px rgba(255, 215, 0, 0.4)'
                                    : 'none',
                                cursor: levelData.isPrestigeReady || user.prestige_level === 0 ? 'pointer' : 'default', // Allow clicking even if locked to see modal? User implied button text changes.
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {levelData.isPrestigeReady
                                ? '🔥 ' + t('ENTER PRESTIGE')
                                : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <span>🔒</span>
                                        <span>{t('Prestige Rank')} {user.prestige_level + 1}</span>
                                    </div>
                                )
                            }
                        </button>
                    )}

                    {isMaxPrestige && (
                        <div style={{
                            background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                            color: '#000',
                            padding: '8px 16px',
                            borderRadius: '100px',
                            fontWeight: 'bold',
                            boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)',
                            marginTop: '8px'
                        }}>
                            {t('MAX RANK ACHIEVED')}
                        </div>
                    )}
                </div>




                {user.bio && <p style={{ fontSize: '0.9rem', maxWidth: '300px', textAlign: 'center', color: 'var(--text-muted)' }}>{user.bio}</p>}

                <PrestigeModal
                    isOpen={showPrestige}
                    onClose={() => setShowPrestige(false)}
                    currentPrestige={user.prestige_level}
                    onConfirm={handlePrestigeConfirm} // Always allow attempt. Server validates.
                    onComplete={() => {
                        window.location.reload(); // Hard reload to ensure clean state after prestige
                    }}
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

            {
                activeTab === 'overview' ? (
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
                    <>
                        <section style={{ marginBottom: '32px' }}>
                            <AchievementsGallery userId={user.id} />
                        </section>
                        <StatsTab />
                    </>
                )
            }

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
