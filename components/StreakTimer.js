"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Timer, Snowflake, Flame } from 'lucide-react';
import { getStreakInfo } from '@/lib/streak';

export default function StreakTimer() {
    const { user } = useStore();
    const [timeLeft, setTimeLeft] = useState(null);
    const [isUrgent, setIsUrgent] = useState(false);
    const [isBroken, setIsBroken] = useState(false);

    useEffect(() => {
        if (!user) return;

        const tick = () => {
            const info = getStreakInfo(user);
            
            if (info.isFrozen) return;
            
            if (info.isReadyToStart) {
                setTimeLeft('Ready to start!');
                return;
            }

            if (info.isLost) {
                setIsBroken(true);
                setTimeLeft('00h 00m 00s');
                return;
            }

            const now = new Date();
            const diffMs = info.deadlineDate - now;

            const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

            setIsUrgent(totalHours < 12);

            setTimeLeft(
                `${totalHours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
            );
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [user]);

    if (!user) return null;

    // --- RENDER FROZEN STATE ---
    if (user.streak_status === 'frozen') {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(125,211,252,0.05))',
                border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '16px'
            }}>
                <div style={{ background: 'rgba(56,189,248,0.2)', padding: '12px', borderRadius: '12px' }}>
                    <Snowflake size={24} color="#38bdf8" />
                </div>
                <div>
                    <h3 style={{ fontSize: '1rem', color: '#38bdf8', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Streak Frozen
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Active until {user.frozen_until ? new Date(user.frozen_until).toLocaleDateString() : 'logged out'}. Rest up!
                    </p>
                </div>
            </div>
        );
    }

    // --- RENDER REGULAR TIMER ---
    const isReadyToStart = timeLeft === 'Ready to start!';

    // Core styling based on urgency
    const bgGrade = isBroken ? 'rgba(239,68,68,0.08)' : isUrgent ? 'rgba(249,115,22,0.08)' : 'rgba(251,191,36,0.08)';
    const borderColor = isBroken ? 'rgba(239,68,68,0.3)' : isUrgent ? 'rgba(249,115,22,0.3)' : 'rgba(251,191,36,0.3)';
    const mainColor = isBroken ? '#ef4444' : isUrgent ? '#f97316' : '#fbbf24';

    return (
        <div style={{
            background: `linear-gradient(135deg, ${bgGrade}, transparent)`,
            border: `1px solid ${borderColor}`,
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginTop: '16px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Subtle pulse effect for urgency */}
            {isUrgent && !isBroken && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: mainColor, opacity: 0.05,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
            )}

            <div style={{ background: `rgba(${isBroken ? '239,68,68' : isUrgent ? '249,115,22' : '251,191,36'},0.2)`, padding: '12px', borderRadius: '12px', zIndex: 1 }}>
                {isBroken ? <Flame size={24} color={mainColor} style={{ opacity: 0.5 }} /> : <Timer size={24} color={mainColor} />}
            </div>
            <div style={{ zIndex: 1, flex: 1 }}>
                <h3 style={{ fontSize: '0.9rem', color: mainColor, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                    {isBroken ? 'Streak Lost' : isReadyToStart ? 'Start Your Engine' : 'Streak Timer'}
                </h3>

                {/* Timer text */}
                {!isReadyToStart && (
                    <div style={{
                        fontFamily: 'monospace',
                        fontSize: '1.4rem',
                        fontWeight: 'bold',
                        color: 'white',
                        textShadow: `0 0 10px ${mainColor}40`
                    }}>
                        {timeLeft || 'Calculating...'}
                    </div>
                )}

                {isReadyToStart && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Log a workout to ignite your streak!
                    </div>
                )}

                {/* Subtext */}
                {!isReadyToStart && !isBroken && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Time remaining before your streak resets.
                    </div>
                )}
            </div>
        </div>
    );
}
