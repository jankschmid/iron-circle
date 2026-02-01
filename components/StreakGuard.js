"use client";

import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';

export default function StreakGuard() {
    const { history, user } = useStore();

    if (!history) return null;

    // 1. Calculate Current Streak (Mock / Client-side Logic for now until DB aggregation catches up)
    // Basic logic: Count consecutive weeks with at least 1 workout.
    // Ideally, this comes from 'user.streak' in profile.

    // For now, let's look at recent frequency.
    const lastWorkout = history[0];
    if (!lastWorkout) return null; // New user

    const lastDate = new Date(lastWorkout.endTime);
    const now = new Date();
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

    // Simple Risk Logic
    // If > 3 days since last workout, show warning?
    // If > 7 days, streak is lost (or frozen).

    const isAtRisk = diffDays >= 4;
    const isLost = diffDays > 7;

    const streakCount = user?.streak || 1; // Fallback

    if (isLost) {
        return (
            <div style={{
                background: 'rgba(255, 59, 48, 0.1)',
                border: '1px solid var(--error)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{ fontSize: '1.5rem' }}>❄️</div>
                <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--error)' }}>Streak Frozen!</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Get back in the gym to reignite your flame.</div>
                </div>
            </div>
        );
    }

    if (isAtRisk) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'linear-gradient(45deg, rgba(255, 149, 0, 0.1), rgba(255, 59, 48, 0.1))',
                    border: '1px solid var(--warning)',
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}
            >
                <div style={{ fontSize: '1.5rem' }}>⚠️</div>
                <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--warning)' }}>Streak Risk: {streakCount} Weeks</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        You haven't trained in {diffDays} days. Don't lose your progress!
                    </div>
                </div>
            </motion.div>
        );
    }

    // Healthy Streak
    return (
        <div style={{
            background: 'rgba(50, 215, 75, 0.1)',
            border: '1px solid var(--success)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        }}>
            <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ fontSize: '1.5rem' }}
            >
                🔥
            </motion.div>
            <div>
                <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>{streakCount} Week Streak</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>You're crushing it! Keep it up.</div>
            </div>
        </div>
    );
}
