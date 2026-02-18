"use client";

import { useEffect, useState, useRef } from 'react';

import { useTranslation } from '@/context/TranslationContext'; // Assuming this exists based on context

import { getPrestigeTitle, PRESTIGE_DESCRIPTIONS } from '@/lib/gamification';

export default function PrestigeModal({ isOpen, onClose, currentPrestige, onConfirm, onComplete }) {
    const { t } = useTranslation();
    const [isAscending, setIsAscending] = useState(false);
    const [reveal, setReveal] = useState(null); // { headStartXP, newLevel }
    const [displayLevel, setDisplayLevel] = useState(1);
    const [displayXP, setDisplayXP] = useState(0);
    const [lockedPrestige, setLockedPrestige] = useState(currentPrestige); // Lock rank on open

    const XP_REQ = 534600; // Level 100 (Synced with gamification.js)

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            console.log("PrestigeModal OPENED. Locked Rank:", currentPrestige);
            setLockedPrestige(currentPrestige);
            setReveal(null);
            setDisplayLevel(1);
            setDisplayXP(0);
            setIsAscending(false);
        }
    }, [isOpen]);

    // Validation
    const isReady = !!onConfirm;

    const handleAscend = async () => {
        // DEBUG: Verify click
        console.log("PrestigeModal: handleAscend CLICKED");
        alert("DEBUG: Button Clicked! Starting Ascension...");

        if (!onConfirm) return;
        setIsAscending(true);

        // Execute Server Action
        const result = await onConfirm();

        if (result.error) {
            alert(`ERROR: ${result.error}\nDEBUG: ${result.debug}`);
            setIsAscending(false);
            return;
        }

        // TEMP DEBUG ALERT - Clear feedback for user
        // alert(`ASCENSION SUCCESSFUL!\n\nRank Upgrade: ${result.debug.split('|')[3]} -> ${result.debug.split('|')[4]}\nHead Start XP: ${result.headStartXP}`);

        // Success - Start Reveal
        setReveal(result); // { success: true, headStartXP, newLevel }
        triggerConfetti();
        startAnimation(result.headStartXP, result.newLevel);
    };

    const triggerConfetti = async () => {
        const confetti = (await import('canvas-confetti')).default;
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#ff0000', '#ffffff', '#000000']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#ff0000', '#ffffff', '#000000']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    };

    const [step, setStep] = useState(0); // 0: Init, 1: Badge, 2: Stats, 3: Button

    const startAnimation = (totalXP, targetLevel) => {
        // RESET
        setStep(1); // Show Badge immediately
        const duration = 2000;
        const startTime = Date.now();

        // DELAY STATS REVEAL
        setTimeout(() => {
            setStep(2); // Show Stats container

            // START COUNTING
            const animate = () => {
                const now = Date.now();
                const elapsed = now - (startTime + 800); // Offset by delay
                const progress = Math.min(1, Math.max(0, elapsed / duration));

                // EaseOutExpo (Snappy)
                const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

                const currentXP = Math.floor(totalXP * ease);
                const currentLevel = 1 + Math.floor((targetLevel - 1) * ease);

                setDisplayXP(currentXP);
                setDisplayLevel(currentLevel);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setTimeout(() => setStep(3), 500); // Show Button
                }
            };
            requestAnimationFrame(animate);

        }, 800); // 0.8s delay for badge Entry
    };

    if (!isOpen) return null;

    // REVEAL MODE
    if (reveal) {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: '#050505', zIndex: 10000,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-primary, sans-serif)', padding: '20px'
            }}>
                {/* STAGE 1: BADGE */}
                <div style={{
                    textAlign: 'center',
                    opacity: step >= 1 ? 1 : 0,
                    // Use standard fadeIn for container, but the IMAGE will stamp
                    transition: 'opacity 0.5s ease'
                }}>
                    <h1 style={{
                        color: 'var(--primary, #FF0000)', fontSize: 'clamp(2rem, 8vw, 4rem)', fontWeight: '900',
                        textTransform: 'uppercase', marginBottom: '2vh', letterSpacing: 'clamp(2px, 1vw, 4px)',
                        textShadow: '0 0 30px rgba(255,0,0,0.4)', margin: 0
                    }}>
                        {t('ASCENSION')}
                    </h1>

                    <div style={{ position: 'relative', margin: '3vh auto', height: 'clamp(150px, 40vw, 250px)', width: 'clamp(150px, 40vw, 250px)' }}>
                        {/* Glow Behind - REMOVED per user request (was clashing) */}
                        <div style={{
                            position: 'absolute', inset: '10%',
                            background: 'transparent', // Removed red glow
                            zIndex: -1, borderRadius: '50%',
                            animation: step >= 1 ? 'pulse 3s infinite' : 'none'
                        }} />
                        <img
                            src={`/assets/prestige/Prestige_${String((Number(lockedPrestige) || 0) + 1).padStart(2, '0')}.png`}
                            alt="New Rank"
                            style={{
                                width: '100%', height: '100%', objectFit: 'contain',
                                width: '100%', height: '100%', objectFit: 'contain',
                                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.2))', // White/clean shadow
                                // STAMP ANIMATION: Only run when step becomes 1
                                animation: step === 1 ? 'stampIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' : (step > 1 ? 'float 3s ease-in-out infinite' : 'none'),
                                opacity: step >= 1 ? 1 : 0,
                                transform: step >= 1 ? 'scale(1)' : 'scale(3)' // Initial state for stamp
                            }}
                        />
                    </div>
                </div>

                {/* STAGE 2: STATS */}
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '2vh', width: '100%', maxWidth: '500px',
                    opacity: step >= 2 ? 1 : 0, transform: step >= 2 ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.5s ease-out'
                }}>
                    {/* Head Start Card */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <span style={{ color: '#888', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase' }}>HEAD START XP</span>
                        <span style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            +{displayXP.toLocaleString()}
                        </span>
                    </div>

                    {/* Level Restore Card */}
                    <div style={{
                        background: 'rgba(255,0,0,0.1)', padding: '15px', borderRadius: '12px',
                        border: '1px solid rgba(255,0,0,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <span style={{ color: 'var(--primary, #FF0000)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase' }}>LEVEL RESTORED</span>
                        <span style={{ color: 'var(--primary, #FF0000)', fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {displayLevel}
                        </span>
                    </div>
                </div>

                {/* STAGE 3: BUTTON */}
                <div style={{
                    marginTop: '5vh',
                    opacity: step >= 3 ? 1 : 0, pointerEvents: step >= 3 ? 'auto' : 'none',
                    transition: 'opacity 0.5s ease'
                }}>
                    <button
                        onClick={onComplete}
                        style={{
                            padding: '16px 40px', fontSize: '1.1rem', fontWeight: '800',
                            background: '#fff', color: '#000', border: 'none', borderRadius: '100px',
                            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px',
                            boxShadow: '0 0 30px rgba(255,255,255,0.2)', width: '100%'
                        }}
                    >
                        {t('CONTINUE JOURNEY')}
                    </button>
                </div>

                <style jsx>{`
                    @keyframes pulse { 0% { opacity: 0.5; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.5; transform: scale(0.9); } }
                    @keyframes stampIn {
                        0% { opacity: 0; transform: scale(3); }
                        60% { opacity: 1; transform: scale(0.9); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                    @keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }
                `}</style>
            </div>
        );
    }

    // STANDARD MODAL
    const prestigeRanks = Array.from({ length: 12 }, (_, i) => i + 1);
    const numericCurrent = Number(lockedPrestige) || 0;
    const nextPrestige = numericCurrent + 1;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto'
        }}>
            <div style={{
                background: 'linear-gradient(145deg, #1a1a1a, #000000)',
                border: '1px solid var(--primary)',
                boxShadow: '0 0 50px rgba(255, 255, 255, 0.05)', // Neutral/Iron glow
                padding: '30px',
                borderRadius: '24px',
                maxWidth: '600px',
                width: '100%',
                textAlign: 'center',
                position: 'relative'
            }}>
                <div style={{
                    position: 'absolute', top: '20px', right: '20px', cursor: 'pointer',
                    fontSize: '1.5rem', color: 'var(--text-muted)'
                }} onClick={onClose}>✕</div>

                <h2 style={{
                    fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '8px',
                    textTransform: 'uppercase', letterSpacing: '2px'
                }}>
                    {t('Prestige Ranks')}
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                    {t('Ascend through the ranks to prove your worth.')}
                </p>

                {/* Grid of Ranks */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                    gap: '16px', marginBottom: '32px'
                }}>
                    {prestigeRanks.map(rank => {
                        const isUnlocked = rank <= numericCurrent;
                        const isNext = rank === nextPrestige;
                        const isFuture = rank > nextPrestige;

                        return (
                            <div key={rank} style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                opacity: isFuture ? 0.3 : 1,
                                filter: isFuture ? 'blur(5px) grayscale(100%)' : 'none',
                                transform: isNext ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.3s ease'
                            }}>
                                <div style={{
                                    width: '64px', height: '64px', marginBottom: '8px', borderRadius: '50%',
                                    background: isNext ? 'radial-gradient(circle, rgba(255,0,0,0.2) 0%, rgba(0,0,0,0) 70%)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: isNext ? '2px solid var(--primary)' : 'none'
                                }}>
                                    <img
                                        src={`/assets/prestige/Prestige_${String(rank).padStart(2, '0')}.png`}
                                        alt={`Rank ${rank}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                </div>
                                <span style={{ fontSize: '0.75rem', color: isNext ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                                    {getPrestigeTitle(rank)}
                                </span>
                                {isNext && (
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: '2px', maxWidth: '80px', lineHeight: '1.2' }}>
                                        {PRESTIGE_DESCRIPTIONS[rank]}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Ascension Logic */}
                {onConfirm ? (
                    <div style={{ background: 'rgba(255,0,0,0.1)', padding: '24px', borderRadius: '16px', border: '1px solid var(--primary)' }}>
                        <h3 style={{ color: '#fff', marginBottom: '8px', textTransform: 'uppercase' }}>
                            {t('Ready to Ascend?')} <span style={{ color: 'var(--primary)' }}>{getPrestigeTitle(nextPrestige)}</span>
                        </h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '16px' }}>
                            <strong>Requirement:</strong> Level 100 ({XP_REQ.toLocaleString()} XP). {t('Reset Level 50 -> 1. Keep Lifetime XP. Earn Rank')} {nextPrestige}.
                        </p>
                        <p style={{ color: '#fff', fontSize: '1rem', fontStyle: 'italic', marginBottom: '24px' }}>
                            "{PRESTIGE_DESCRIPTIONS[nextPrestige]}"
                        </p>
                        <button
                            onClick={handleAscend}
                            style={{
                                width: '100%', padding: '16px', background: 'var(--primary)', border: 'none',
                                color: '#000', borderRadius: '100px', fontWeight: '900', fontSize: '1.1rem',
                                cursor: isAscending ? 'not-allowed' : 'pointer',
                                boxShadow: '0 0 30px var(--primary-glow)', textTransform: 'uppercase',
                                opacity: isAscending ? 0.7 : 1
                            }}
                            disabled={!isReady || isAscending}
                        >
                            {isAscending ? t('ASCENDING...') : `${t('ASCEND TO RANK')} ${nextPrestige}`}
                        </button>
                    </div>
                ) : (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                            Prestige allows you to reset your level to 1 and gain a permanent XP multiplier.
                            You must reach <strong>Level 100</strong> to ascend.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
