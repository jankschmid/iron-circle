"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Footprints, Flame, CalendarCheck, Timer, Trophy, RotateCcw, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/context/TranslationContext';

export default function OperationsDashboard({ userId }) {
    const { t, language } = useTranslation();
    const [operations, setOperations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(null);
    const [rerolling, setRerolling] = useState(null);
    const [supabase] = useState(() => createClient());

    const [rerolls, setRerolls] = useState(0);

    useEffect(() => {
        if (!userId) return;

        const init = async () => {
            // Use Server-Side Logic (RPC) for assignment
            const { data, error } = await supabase.rpc('assign_daily_operations');
            if (error) {
                console.error("Assignment Error Details:", error.message || error.details || error);
            } else if (data && !data.success) {
                console.warn("Assignment Not Successful:", data.message);
            }
            fetchOperations();
        };

        const fetchOperations = async () => {
            const { data } = await supabase
                .from('user_operations')
                .select('*, template:operations_templates(*)')
                .eq('user_id', userId)
                .order('is_completed', { ascending: true }) // Completed last
                .order('expires_at', { ascending: true }); // Expiring soon first

            const { data: profile } = await supabase
                .from('profiles')
                .select('rerolls_available')
                .eq('id', userId)
                .single();

            if (data) setOperations(data);
            if (profile) setRerolls(profile.rerolls_available || 0);

            setLoading(false);
        };

        init();

        const channel = supabase
            .channel('operations_ui_update')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_operations', filter: `user_id=eq.${userId}` },
                () => fetchOperations()
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [userId, supabase]);

    const handleClaim = async (op) => {
        setClaiming(op.id);
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

        // Call RPC
        const { data, error } = await supabase.rpc('claim_operation_reward', { p_op_id: op.id });

        if (error || !data.success) {
            alert(error?.message || data?.message || "Claim failed");
        } else {
            // Trigger confetti (Lazy Load)
            const confetti = (await import('canvas-confetti')).default;
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#EAB308', '#CA8A04', '#FEF08A'], // Gold
                disableForReducedMotion: true
            });
        }
        setClaiming(null);
    };

    const handleReroll = async (op) => {
        if (rerolls <= 0) return;
        setRerolling(op.id);

        const { data, error } = await supabase.rpc('reroll_operation', { p_op_id: op.id });

        if (error || !data.success) {
            alert(error?.message || data?.message || "Reroll failed");
        } else {
            // Success handled by realtime subscription refreshing the list
            if (navigator.vibrate) navigator.vibrate(50);
        }
        setRerolling(null);
    };

    // Helper for icons
    const getIcon = (metric, type) => {
        if (type === 'weekly') return <Trophy size={20} />;
        switch (metric) {
            case 'volume': return <Dumbbell size={20} />;
            case 'distance': return <Footprints size={20} />;
            case 'workouts': return <CalendarCheck size={20} />;
            case 'duration': return <Timer size={20} />;
            default: return <Flame size={20} />;
        }
    };

    if (loading) return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading Operations...
        </div>
    );

    const isActive = (op) => new Date(op.expires_at) > new Date();
    const dailies = operations.filter(op => op.template.type === 'daily' && isActive(op));
    const weeklies = operations.filter(op => op.template.type === 'weekly' && isActive(op));

    return (
        <div style={{ width: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: 'var(--text-dim)',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{ color: 'var(--error)' }}>⚡</span> {t('Active Operations') || 'Active Operations'}
                </h3>

                {rerolls > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RefreshCw size={14} /> {rerolls} {t('Turnovers')}
                    </div>
                )}
            </div>

            {/* Dailies Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <AnimatePresence>
                    {dailies.map(op => (
                        <OperationCard
                            key={op.id}
                            op={op}
                            onClaim={handleClaim}
                            onReroll={handleReroll}
                            isClaiming={claiming === op.id}
                            isRerolling={rerolling === op.id}
                            canReroll={rerolls > 0}
                            getIcon={getIcon}
                            language={language}
                            t={t}
                        />
                    ))}
                </AnimatePresence>

                {dailies.length === 0 && (
                    <div style={{
                        gridColumn: '1 / -1',
                        padding: '30px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        border: '1px dashed var(--border)',
                        borderRadius: '8px'
                    }}>
                        {t('No active daily missions. Check back tomorrow.')}
                    </div>
                )}
            </div>

            {/* Weeklies */}
            {weeklies.length > 0 && (
                <>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                        {t('Weekly Directives')}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {weeklies.map(op => (
                            <OperationCard
                                key={op.id}
                                op={op}
                                onClaim={handleClaim}
                                // No rerolls for weeklies? Or maybe yes? Let's disable for now as per "Turnovers" context usually implies dailies.
                                onReroll={null}
                                isClaiming={claiming === op.id}
                                getIcon={getIcon}
                                language={language}
                                t={t}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function OperationCard({ op, onClaim, onReroll, isClaiming, isRerolling, canReroll, getIcon, language, t }) {
    const { template, current_progress, is_completed } = op;
    const progressPercent = Math.min(100, Math.floor((current_progress / template.target_value) * 100));
    const isReadyToClaim = !is_completed && current_progress >= template.target_value;
    const icon = getIcon(template.target_metric, template.type);

    const displayTitle = template.translations?.[language]?.title || template.title;
    const displayDescription = template.translations?.[language]?.description || template.description;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
                background: 'var(--surface)',
                border: isReadyToClaim ? '1px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: isReadyToClaim ? 'var(--success-dim)' : 'var(--surface-highlight)',
                        color: isReadyToClaim ? 'var(--success)' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {icon}
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: is_completed ? 'var(--text-muted)' : 'var(--foreground)', textDecoration: is_completed ? 'line-through' : 'none' }}>
                            {displayTitle}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {displayDescription}
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ color: 'var(--brand-yellow)', fontWeight: 'bold', fontSize: '0.9rem' }}>+{template.xp_reward} XP</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{
                height: '8px',
                background: 'var(--surface-highlight)',
                borderRadius: '100px',
                marginBottom: '8px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: isReadyToClaim ? 'var(--success)' : 'var(--primary)',
                    borderRadius: '100px',
                    transition: 'width 0.5s ease-out'
                }} />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <div style={{ color: 'var(--text-muted)' }}>
                    {current_progress} / {template.target_value} {template.target_metric.replace(/_/g, ' ')}
                </div>

                {is_completed ? (
                    <div style={{ color: 'var(--success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ {t('COMPLETED')}
                    </div>
                ) : isReadyToClaim ? (
                    <button
                        onClick={() => onClaim(op)}
                        disabled={isClaiming}
                        style={{
                            background: 'var(--success)',
                            color: '#000',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: '100px',
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            animation: 'pulse 2s infinite'
                        }}
                    >
                        {isClaiming ? t('CLAIMING...') : t('CLAIM REWARD')}
                    </button>
                ) : onReroll ? (
                    <button
                        onClick={() => onReroll(op)}
                        disabled={!canReroll || isRerolling}
                        style={{
                            background: canReroll ? 'var(--surface-highlight)' : 'transparent',
                            border: canReroll ? '1px solid var(--border)' : '1px solid transparent',
                            color: canReroll ? 'var(--text-muted)' : 'var(--text-dim)',
                            padding: '6px 16px',
                            borderRadius: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: canReroll ? 'pointer' : 'not-allowed',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                        title={t("Turnover Mission")}
                    >
                        <RefreshCw size={14} className={isRerolling ? "animate-spin" : ""} />
                        <span>{isRerolling ? t('Flipping...') : t('Flip Mission')}</span>
                    </button>
                ) : null}
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </motion.div>
    );
}
