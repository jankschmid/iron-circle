import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useTranslation } from '@/context/TranslationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Footprints, Flame, CalendarCheck, Timer, Trophy, RotateCcw } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getLevelProgress } from '@/lib/gamification';

export default function OperationsBoard({ userId }) {
    const { t } = useTranslation();
    const { user, setUser } = useStore();
    const [operations, setOperations] = useState([]);
    const [rerolls, setRerolls] = useState(0);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // Fetch Ops
    const fetchOps = async () => {
        try {
            setLoading(true);
            // 1. Trigger Assignment (Lazy)
            const { error: rpcError } = await supabase.rpc('assign_daily_operations');
            if (rpcError) console.error("Assign Ops Error:", rpcError);

            // 2. Fetch Data
            const { data: ops, error: fetchError } = await supabase
                .from('user_operations')
                .select(`
                id, current_progress, is_completed, expires_at,
                template:operations_templates(title, description, target_value, target_metric, xp_reward, type)
            `)
                .eq('user_id', userId)
                // .eq('is_claimed', false) // REMOVED: Column does not exist. Assuming is_completed means claimed/done.
                .order('expires_at', { ascending: true }); // Dailies first usually

            if (fetchError) throw fetchError;

            // 3. Get Rerolls
            const { data: profile } = await supabase.from('profiles').select('rerolls_available').eq('id', userId).single();

            if (ops) setOperations(ops);
            if (profile) setRerolls(profile.rerolls_available || 0);

        } catch (err) {
            console.error("Error fetching operations:", err);
            // setOperations([]); // Optional: clear or keep old
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchOps();
        } else {
            setLoading(false);
        }
    }, [userId]);

    const handleClaim = async (opId, xp) => {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

        const { data, error } = await supabase.rpc('claim_operation_reward', { p_op_id: opId });

        if (data && data.success) {
            // Update Local User State (Level Up Check)
            if (user) {
                const newLifetime = (user.lifetime_xp || 0) + xp;
                const progress = getLevelProgress(newLifetime);

                setUser(prev => ({
                    ...prev,
                    lifetime_xp: newLifetime,
                    current_xp: progress.progress,
                    level: progress.currentLevel
                }));

                // Check for Level Up Toast?
                if (progress.currentLevel > (user.level || 1)) {
                    // toast.success(`LEVEL UP! You are now Level ${progress.currentLevel}!`);
                }
            }

            fetchOps(); // Refresh list
        }
    };

    const handleReroll = async (opId) => {
        if (rerolls <= 0) return;

        const { data, error } = await supabase.rpc('reroll_operation', { p_op_id: opId });
        if (data && data.success) {
            fetchOps();
        } else {
            alert(data?.message || 'Reroll failed');
        }
    };

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

    if (loading) return <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Operations...</div>;

    return (
        <div style={{ padding: '0 20px 20px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', margin: 0 }}>
                    ⚠️ {t('Active Operations')}
                </h2>
                <div style={{ fontSize: '0.8rem', color: rerolls > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                    Turnovers: {rerolls}/1
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <AnimatePresence>
                    {operations.map(op => {
                        const progress = Math.min((op.current_progress / op.template.target_value) * 100, 100);
                        // Fix: Schema has no is_claimed. 
                        // We assume is_completed = CLAIMED.
                        // So Ready = Progress Met AND NOT Claimed (is_completed false)
                        const isReadyToClaim = !op.is_completed && op.current_progress >= op.template.target_value;
                        const icon = getIcon(op.template.target_metric, op.template.type);

                        return (
                            <motion.div
                                key={op.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                style={{
                                    background: 'var(--surface)',
                                    border: isReadyToClaim ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Info Row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <div style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: isReadyToClaim ? 'var(--success-dim)' : 'var(--surface-highlight)',
                                            color: isReadyToClaim ? 'var(--success)' : 'var(--primary)'
                                        }}>
                                            {icon}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{op.template.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{op.template.description}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>+{op.template.xp_reward} XP</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{op.template.type}</div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div style={{ position: 'relative', height: '6px', background: 'var(--surface-highlight)', borderRadius: '100px', marginBottom: '8px' }}>
                                    <div style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        background: isReadyToClaim ? 'var(--success)' : 'var(--primary)',
                                        borderRadius: '100px',
                                        transition: 'width 0.5s'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    <span>{op.current_progress} / {op.template.target_value} {op.template.target_metric}</span>
                                    {isReadyToClaim && <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>MISSION COMPLETE</span>}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '8px' }}>
                                    {/* Reroll Button - Only for Dailies and if Rerolls > 0 and NOT complete */}
                                    {!op.is_completed && op.template.type === 'daily' && rerolls > 0 && (
                                        <button
                                            onClick={() => handleReroll(op.id)}
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-muted)',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}
                                        >
                                            <RotateCcw size={12} /> Swap
                                        </button>
                                    )}

                                    {/* Claim Button */}
                                    {isReadyToClaim && (
                                        <button
                                            onClick={() => handleClaim(op.id, op.template.xp_reward)}
                                            style={{
                                                background: 'var(--success)',
                                                border: 'none',
                                                color: '#000',
                                                padding: '6px 16px',
                                                borderRadius: '100px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                animation: 'pulse 1s infinite'
                                            }}
                                        >
                                            CLAIM REWARD
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}

                    {operations.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                            No active operations. Check back tomorrow soldier.
                        </div>
                    )}
                </AnimatePresence>
            </div>
            <style jsx>{`
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
                    70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
                }
            `}</style>
        </div>
    );
}
