"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
// import { syncOperations, claimReward } from '@/app/actions/gamification'; // DISABLED FOR STATIC EXPORT
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Footprints, Flame, CalendarCheck, Timer, Trophy, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTranslation } from '@/context/TranslationContext';

// --- CLIENT SIDE GAMIFICATION LOGIC ---
async function clientSyncOperations(supabase, userId) {
    try {
        const today = new Date();
        const expiresAt = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // 1. Check existing active operations
        const { data: activeOps, error: fetchError } = await supabase
            .from("user_operations")
            .select("*, template:operations_templates(*)")
            .eq("user_id", userId)
            .gt("expires_at", new Date().toISOString());

        if (fetchError) throw fetchError;

        const hasDaily = activeOps.some(op => op.template && op.template.type === "daily");
        if (hasDaily) return; // Already good

        // 2. Generate new Daily Operations
        const { data: templates } = await supabase
            .from("operations_templates")
            .select("*")
            .eq("type", "daily");

        if (!templates || templates.length === 0) return;

        // Select 3 random
        const selected = templates.sort(() => 0.5 - Math.random()).slice(0, 3);

        const newOps = selected.map(template => ({
            user_id: userId,
            template_id: template.id,
            expires_at: expiresAt,
            current_progress: 0,
            is_completed: false
        }));

        await supabase.from("user_operations").insert(newOps);
    } catch (e) {
        console.error("Sync Ops Error:", e);
    }
}

async function clientClaimReward(supabase, opId, userId) {
    try {
        // 1. Fetch Op
        const { data: op } = await supabase
            .from("user_operations")
            .select("*, template:operations_templates(*)")
            .eq("id", opId)
            .single();

        if (!op || op.is_completed) return { error: "Invalid claim" };

        if (op.current_progress < op.template.target_value) {
            return { error: "Mission not complete" };
        }

        const reward = op.template.xp_reward;

        // 2. Update Profile (Read-Modify-Write)
        const { data: profile } = await supabase
            .from("profiles")
            .select("current_xp, lifetime_xp, level, cycle_xp")
            .eq("id", userId)
            .single();

        // XP Logic
        const currentLifetime = Number(profile.lifetime_xp || 0);
        const currentCycle = Number(profile.cycle_xp || 0);

        const newLifetime = currentLifetime + reward; // Score
        const newCycle = currentCycle + reward;       // Level Progress

        // Calculate Level from Cycle XP
        // We can import the helper or just blindly update. Ideally replicate logic.
        // For now, let's just push the XP. The Store/UI will handle level recalc on refetch?
        // Actually, let's just update the values.

        await supabase.from("profiles").update({
            lifetime_xp: newLifetime,
            cycle_xp: newCycle,
            current_xp: (profile.current_xp || 0) + reward // Visual only
        }).eq("id", userId);

        // 3. Mark Complete
        await supabase.from("user_operations").update({ is_completed: true }).eq("id", opId);

        return { success: true };

    } catch (e) {
        console.error("Claim Error:", e);
        return { error: e.message };
    }
}


export default function OperationsDashboard({ userId }) {
    const { t } = useTranslation();
    const [operations, setOperations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(null);
    const [supabase] = useState(() => createClient());

    const [rerolls, setRerolls] = useState(0);

    useEffect(() => {
        if (!userId) return;

        // 1. Sync daily operations on mount
        const init = async () => {
            await clientSyncOperations(supabase, userId); // Client-side logic
            fetchOperations();
        };

        const fetchOperations = async () => {
            // ... existing fetch logic ...
            // COPY PASTING REST OF FUNCTION BODY TO PRESERVE IT
            // Fetch Ops
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

        const result = await clientClaimReward(supabase, op.id, userId);

        if (result.error) {
            alert(result.error);
        } else {
            // Trigger confetti
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

    const dailies = operations.filter(op => op.template.type === 'daily');
    const weeklies = operations.filter(op => op.template.type === 'weekly');

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
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                        Turnovers: {rerolls}
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
                            isClaiming={claiming === op.id}
                            getIcon={getIcon}
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
                        No active daily missions. Check back tomorrow.
                    </div>
                )}
            </div>

            {/* Weeklies */}
            {weeklies.length > 0 && (
                <>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                        Weekly Directives
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {weeklies.map(op => (
                            <OperationCard
                                key={op.id}
                                op={op}
                                onClaim={handleClaim}
                                isClaiming={claiming === op.id}
                                getIcon={getIcon}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function OperationCard({ op, onClaim, isClaiming, getIcon }) {
    const { template, current_progress, is_completed } = op;
    const progressPercent = Math.min(100, Math.floor((current_progress / template.target_value) * 100));
    const isReadyToClaim = !is_completed && current_progress >= template.target_value;
    const icon = getIcon(template.target_metric, template.type);

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
                            {template.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {template.description}
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
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
                        ✓ COMPLETED
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
                        {isClaiming ? 'CLAIMING...' : 'CLAIM REWARD'}
                    </button>
                ) : null}
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
                }
            `}</style>
        </motion.div>
    );
}
