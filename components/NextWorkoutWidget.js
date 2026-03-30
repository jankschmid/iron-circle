"use client";

import { useStore } from '@/lib/store';
import { useTranslation } from '@/context/TranslationContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function NextWorkoutWidget() {
    const { t } = useTranslation();
    const { workoutPlans, history } = useStore();
    const router = useRouter();

    const activePlan = workoutPlans.find(p => p.is_active);

    if (!activePlan) {
        return (
            <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '2rem' }}>🤔</div>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>{t('No Active Plan')}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {t('Select a training plan to stay on track and build consistency.')}
                </p>
                <button
                    onClick={() => router.push('/workout')}
                    style={{
                        background: 'var(--primary)',
                        color: '#000',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '100px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        marginTop: '8px'
                    }}
                >
                    {t('Browse Library')}
                </button>
            </div>
        );
    }

    // Determine the next day in the plan
    // Simple logic: we look at how many days in the plan exist, and where the user currently is.
    // If we have history, we could trace it exactly. For a simple widget, if there's an active plan,
    // let's just suggest the Next Day that isn't logged today, or just highlight the Plan itself.
    // Given the data structure, Day cards in Workout planner just start. Let's just link to the Workout tab!
    
    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push('/workout')}
            style={{
                background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.1) 0%, rgba(217, 119, 6, 0.02) 100%)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{ position: 'absolute', top: -40, right: -40, width: 100, height: 100, background: 'var(--primary)', filter: 'blur(50px)', opacity: 0.2 }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}>🚀</div>
                <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        {t('Up Next')}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--foreground)' }}>
                        {activePlan.name}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {t('Tap to resume your journey')}
                    </p>
                </div>
            </div>
            <div style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>→</div>
        </motion.div>
    );
}
