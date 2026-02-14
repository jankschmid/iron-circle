"use client";

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useTranslation } from '@/context/TranslationContext'; // Assuming this exists based on context

export default function PrestigeModal({ isOpen, onClose, currentPrestige, onConfirm }) {
    const { t } = useTranslation();
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAnimate(true);
        } else {
            setAnimate(false);
        }
    }, [isOpen]);

    const handleAscend = () => {
        // Trigger Confetti
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#ff0000', '#ffffff', '#000000'] // Iron Theme
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

        // Execute callback
        if (onConfirm) onConfirm();
    };

    if (!isOpen) return null;

    // Prestige Ranks 1-12
    const prestigeRanks = Array.from({ length: 12 }, (_, i) => i + 1);
    const numericCurrent = Number(currentPrestige) || 0;
    const nextPrestige = numericCurrent + 1;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto'
        }}>
            <div style={{
                background: 'linear-gradient(145deg, #1a1a1a, #000000)',
                border: '1px solid var(--primary)',
                boxShadow: '0 0 50px rgba(255, 0, 0, 0.2)',
                padding: '30px',
                borderRadius: '24px',
                maxWidth: '600px',
                width: '100%',
                textAlign: 'center',
                animation: animate ? 'slideUp 0.5s ease-out' : 'none',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    color: 'var(--text-muted)'
                }} onClick={onClose}>✕</div>

                <h2 style={{
                    fontSize: '2rem',
                    fontWeight: '900',
                    color: 'var(--primary)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '2px'
                }}>
                    {t('Prestige Ranks')}
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                    {t('Ascend through the ranks to prove your worth.')}
                </p>

                {/* Grid of Ranks */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                    gap: '16px',
                    marginBottom: '32px'
                }}>
                    {prestigeRanks.map(rank => {
                        const isUnlocked = rank <= numericCurrent;
                        const isNext = rank === nextPrestige;
                        const isFuture = rank > nextPrestige;

                        return (
                            <div key={rank} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                opacity: isFuture ? 0.3 : 1,
                                filter: isFuture ? 'blur(5px) grayscale(100%)' : 'none',
                                transform: isNext ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.3s ease',
                                position: 'relative'
                            }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    marginBottom: '8px',
                                    borderRadius: '50%',
                                    background: isNext ? 'radial-gradient(circle, rgba(255,0,0,0.2) 0%, rgba(0,0,0,0) 70%)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
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
                                    {isUnlocked ? 'UNLOCKED' : (isNext ? 'NEXT' : `RANK ${rank}`)}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Ascension Logic */}
                {onConfirm ? (
                    <div style={{ background: 'rgba(255,0,0,0.1)', padding: '24px', borderRadius: '16px', border: '1px solid var(--primary)' }}>
                        <h3 style={{ color: '#fff', marginBottom: '8px', textTransform: 'uppercase' }}>{t('Ready to Ascend?')}</h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '16px' }}>
                            {t('Reset Level 50 -> 1. Keep Lifetime XP. Earn Rank')} {nextPrestige}.
                        </p>
                        <button
                            onClick={handleAscend}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'var(--primary)',
                                border: 'none',
                                color: '#000',
                                borderRadius: '100px',
                                fontWeight: '900',
                                fontSize: '1.1rem',
                                cursor: 'pointer',
                                boxShadow: '0 0 30px var(--primary-glow)',
                                textTransform: 'uppercase'
                            }}
                        >
                            {t('ASCEND TO RANK')} {nextPrestige}
                        </button>
                    </div>
                ) : (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                            {t('Reach Level 50 to unlock the next rank.')}
                        </p>
                    </div>
                )}
            </div>
            <style jsx global>{`
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
