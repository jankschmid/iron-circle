"use client";

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

export default function WorkoutHeatmap({ history = [] }) {
    const { user } = useStore();
    const currentYear = new Date().getFullYear();
    const YEARLY_GOAL = user?.workout_goal || 150;

    const stats = useMemo(() => {
        const yearWorkouts = history.filter(w => {
            if (!w.endTime) return false;
            return new Date(w.endTime).getFullYear() === currentYear;
        });

        // Monthly Counts
        const monthlyCounts = new Array(12).fill(0);
        yearWorkouts.forEach(w => {
            const month = new Date(w.endTime).getMonth();
            monthlyCounts[month]++;
        });

        // Max for scaling columns
        const maxMonth = Math.max(...monthlyCounts, 1);

        return {
            total: yearWorkouts.length,
            monthly: monthlyCounts,
            maxMonth
        };
    }, [history, currentYear]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIndex = new Date().getMonth();

    const progressPercent = Math.min((stats.total / YEARLY_GOAL) * 100, 100);

    return (
        <div style={{ width: '100%', padding: '10px 0' }}>
            {/* Header / Yearly Stats */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {currentYear} Consistency
                    </h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: 1 }}>
                        {stats.total} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {YEARLY_GOAL}</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                        {Math.round(progressPercent)}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>of annual goal</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{ height: '6px', width: '100%', background: 'var(--surface-highlight)', borderRadius: '10px', overflow: 'hidden', marginBottom: '32px' }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    style={{ height: '100%', background: 'var(--primary)', borderRadius: '10px' }}
                />
            </div>

            {/* Monthly Bar Chart */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: '8px',
                height: '120px',
                alignItems: 'end'
            }}>
                {stats.monthly.map((count, i) => {
                    const isCurrentMonth = i === currentMonthIndex;
                    const heightPercent = (count / stats.maxMonth) * 100;

                    return (
                        <div key={months[i]} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                            {/* Bar Container */}
                            <div style={{
                                flex: 1,
                                width: '100%',
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                position: 'relative'
                            }}>
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(heightPercent, 0)}%` }} // Ensure at least tiny bar if 0? No, 0 is hidden usually.
                                    transition={{ delay: i * 0.05 }}
                                    style={{
                                        width: '100%',
                                        maxWidth: '16px',
                                        background: count > 0 ? (isCurrentMonth ? 'var(--primary)' : 'var(--surface-highlight)') : 'rgba(255,255,255,0.05)',
                                        borderRadius: '4px 4px 0 0',
                                        minHeight: count > 0 ? '4px' : '0'
                                    }}
                                >
                                    {/* Tooltip on Hover equivalent (simple count inside or above?) - Let's just rely on visual for now or simple title */}
                                    {count > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            marginBottom: '4px',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            opacity: 0,
                                            transition: 'opacity 0.2s'
                                        }} className="bar-label">
                                            {count}
                                        </div>
                                    )}
                                </motion.div>
                            </div>

                            {/* Label */}
                            <div style={{
                                marginTop: '8px',
                                fontSize: '0.7rem',
                                color: isCurrentMonth ? 'var(--primary)' : 'var(--text-muted)',
                                fontWeight: isCurrentMonth ? 'bold' : 'normal'
                            }}>
                                {months[i]}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Simple CSS for the hidden hover labels if we want them */}
            <style jsx>{`
                .bar-label { display: none; }
                div:hover > .bar-label { display: block; opacity: 1 !important; }
            `}</style>
        </div>
    );
}
