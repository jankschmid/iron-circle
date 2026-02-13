"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import StreakGuard from '@/components/StreakGuard';
import WorkoutActive from '@/components/WorkoutActive';
import WorkoutSummary from '@/components/WorkoutSummary';
import BottomNav from '@/components/BottomNav';
import StatsView from '@/components/StatsView';
import PlanManager from '@/components/PlanManager';
import TemplateSelector from '@/components/TemplateSelector';
import QuickLogModal from '@/components/QuickLogModal';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/context/TranslationContext';

export default function WorkoutPage() {
    const { t } = useTranslation();
    const { activeWorkout, workoutPlans, fetchPlans, startWorkout, workoutSummary, clearWorkoutSummary, user, history } = useStore();
    const [view, setView] = useState('plan'); // 'plan' | 'library' | 'stats'
    const [showPlans, setShowPlans] = useState(false);
    const [activeRestDay, setActiveRestDay] = useState(null);

    // Fetch active plans on mount and when user loads
    useEffect(() => {
        if (user) fetchPlans();
    }, [user]);

    const activePlan = workoutPlans.find(p => p.is_active);

    if (activeWorkout) return <WorkoutActive />;

    if (workoutSummary) {
        return <WorkoutSummary data={workoutSummary} onContinue={clearWorkoutSummary} />;
    }

    return (
        <div style={{ paddingBottom: '100px', minHeight: '100vh', background: 'var(--background)' }}>
            {/* Header Tabs */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 90,
                background: 'var(--background)',
                paddingTop: 'calc(40px + env(safe-area-inset-top))', // Increased base padding significantly
                paddingLeft: '20px',
                paddingRight: '20px',
                paddingBottom: '0',
                borderBottom: '1px solid var(--border)',
                transition: 'padding-top 0.2s'
            }}>
                <div style={{ display: 'flex', gap: '8px', paddingBottom: '16px' }}>
                    {['Plan', 'Library', 'Stats'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setView(tab.toLowerCase())}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '12px',
                                border: 'none',
                                background: view === tab.toLowerCase() ? 'var(--primary)' : 'var(--surface)',
                                color: view === tab.toLowerCase() ? '#000' : 'var(--text-muted)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {t(tab)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div style={{ paddingTop: '20px' }}>
                {view === 'plan' && (
                    <div className="container">
                        {activePlan ? (
                            <div style={{ marginBottom: '32px' }}>
                                {/* Active Plan Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Current')}</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{activePlan.name}</div>
                                    </div>
                                    <button
                                        onClick={() => setShowPlans(true)}
                                        style={{ fontSize: '0.9rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        {t('Change')}
                                    </button>
                                </div>

                                {/* Plan Content */}
                                {(activePlan.type === 'flex') ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                                        {activePlan.days.map((day, index) => (
                                            <div key={day.id || index} style={{
                                                background: 'var(--surface)',
                                                padding: '16px',
                                                borderRadius: '16px',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                position: 'relative'
                                            }}>
                                                <div style={{ marginBottom: '12px' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                        {t('Routine')} {index + 1}
                                                    </div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
                                                        {day.template ? day.template.name : (day.label || t('Unnamed Routine'))}
                                                    </div>
                                                </div>

                                                {day.template_id ? (
                                                    <button
                                                        onClick={() => startWorkout(day.template_id, activePlan.id, day.id)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 0',
                                                            background: 'var(--primary)',
                                                            color: 'black',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            marginTop: 'auto'
                                                        }}
                                                    >
                                                        {t('Start Workout')}
                                                    </button>
                                                ) : (
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                                        {t('No template linked')}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (activePlan.days && activePlan.days.length > 0) ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                                        {(() => {
                                            // 1. Determine completion variables first
                                            const daysWithStatus = activePlan.days.map((day, index) => {
                                                const isCompleted = history?.some(w => {
                                                    if (!w.endTime) return false;
                                                    const wDate = new Date(w.endTime);
                                                    const now = new Date();

                                                    const getWeek = d => {
                                                        const date = new Date(d.getTime());
                                                        date.setHours(0, 0, 0, 0);
                                                        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
                                                        const week1 = new Date(date.getFullYear(), 0, 4);
                                                        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
                                                    };

                                                    const isSameWeek = getWeek(wDate) === getWeek(now) && wDate.getFullYear() === now.getFullYear();

                                                    // STRICT CHECK: Plan Day ID or Template ID
                                                    if (day.id && w.plan_day_id) {
                                                        return isSameWeek && w.plan_day_id === day.id;
                                                    }

                                                    // Fallback (only if no plan_day_id in history record, legacy support)
                                                    return isSameWeek && (
                                                        (w.templateId && w.templateId === day.template?.id)
                                                    );
                                                });
                                                return { ...day, isCompleted, index };
                                            });

                                            // 2. Find last completed day index to determine "Missed" days
                                            const lastCompletedIndex = daysWithStatus.reduce((max, day) => {
                                                return day.isCompleted ? Math.max(max, day.index) : max;
                                            }, -1);

                                            return daysWithStatus.map(day => {
                                                const isMissed = !day.isCompleted && day.index < lastCompletedIndex;

                                                return (
                                                    <div key={day.id} style={{
                                                        background: 'var(--surface)',
                                                        padding: '16px',
                                                        borderRadius: '16px',
                                                        border: day.isCompleted ? '1px solid var(--success)' : (isMissed ? '1px solid var(--error)' : '1px solid var(--border)'),
                                                        opacity: isMissed ? 0.7 : 1, // Dim missed workouts
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between',
                                                        position: 'relative',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {day.isCompleted && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: 0, right: 0,
                                                                background: 'var(--success)',
                                                                color: '#000',
                                                                fontSize: '0.7rem',
                                                                padding: '2px 8px',
                                                                fontWeight: 'bold',
                                                                borderRadius: '0 0 0 8px'
                                                            }}>
                                                                {t('DONE')}
                                                            </div>
                                                        )}
                                                        {isMissed && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: 0, right: 0,
                                                                background: 'var(--error)',
                                                                color: '#FFF',
                                                                fontSize: '0.7rem',
                                                                padding: '2px 8px',
                                                                fontWeight: 'bold',
                                                                borderRadius: '0 0 0 8px'
                                                            }}>
                                                                {t('MISSED')}
                                                            </div>
                                                        )}

                                                        <div style={{ marginBottom: '12px' }}>
                                                            <div style={{ fontSize: '0.75rem', color: day.isCompleted ? 'var(--text-muted)' : 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                                {t('Day')} {day.day_order}
                                                            </div>
                                                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: day.isCompleted ? 'var(--text-muted)' : 'var(--foreground)' }}>
                                                                {day.template ? day.template.name : (day.label === 'Rest Day' ? t('Rest Day 💤') : day.label)}
                                                            </div>
                                                        </div>

                                                        {day.template_id ? (
                                                            day.isCompleted ? (
                                                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                                                    <button disabled style={{
                                                                        flex: 1,
                                                                        padding: '10px',
                                                                        background: 'transparent',
                                                                        border: '1px solid var(--success)',
                                                                        color: 'var(--success)',
                                                                        borderRadius: '8px',
                                                                        fontWeight: '600',
                                                                        opacity: 0.8,
                                                                        cursor: 'default'
                                                                    }}>
                                                                        ✓ {t('Done')}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => startWorkout(day.template_id, activePlan.id, day.id)}
                                                                        title="Do again"
                                                                        style={{
                                                                            padding: '10px',
                                                                            background: 'var(--surface-highlight)',
                                                                            border: 'none',
                                                                            borderRadius: '8px',
                                                                            color: 'var(--text-muted)',
                                                                            cursor: 'pointer'
                                                                        }}>
                                                                        ↻
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => startWorkout(day.template_id, activePlan.id, day.id)}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '10px 0',
                                                                        background: 'var(--primary)',
                                                                        color: 'black',
                                                                        border: 'none',
                                                                        borderRadius: '8px',
                                                                        fontWeight: 'bold',
                                                                        cursor: 'pointer',
                                                                        marginTop: 'auto'
                                                                    }}
                                                                >
                                                                    {t('Start Workout')}
                                                                </button>
                                                            )
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setActiveRestDay(day);
                                                                }}
                                                                style={{
                                                                    marginTop: 'auto',
                                                                    width: '100%',
                                                                    padding: '8px',
                                                                    background: 'var(--surface-highlight)',
                                                                    border: '1px dashed var(--border)',
                                                                    borderRadius: '8px',
                                                                    color: 'var(--text-muted)',
                                                                    fontSize: '0.8rem',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {t('Log Activity')} 🧘
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                ) : (
                                    /* Flex Plan View */
                                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--surface)', borderRadius: '16px', border: '2px dashed var(--border)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>♾️</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '8px' }}>{t('Flex Schedule')}</div>
                                        <div style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                                            {t('No fixed days. Log whatever you train today.')}
                                        </div>
                                        <button
                                            onClick={() => setView('library')}
                                            style={{
                                                padding: '12px 24px',
                                                background: 'var(--primary)',
                                                color: 'black',
                                                border: 'none',
                                                borderRadius: '100px',
                                                fontWeight: 'bold',
                                                fontSize: '1rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            + {t('Log Session')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                onClick={() => setShowPlans(true)}
                                style={{
                                    background: 'var(--surface-highlight)',
                                    borderRadius: '16px',
                                    padding: '32px',
                                    marginBottom: '32px',
                                    border: '2px dashed var(--border)',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '4px' }}>{t('Start a Plan')}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('Choose a schedule or create a flex plan.')}</div>
                            </div>
                        )}
                    </div>
                )}

                {view === 'library' && (
                    <div className="container">
                        <div style={{ marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>{t('Workout Library')}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('Manage your templates and presets.')}</p>
                        </div>
                        <TemplateSelector />
                    </div>
                )}

                {view === 'stats' && (
                    <div className="container">
                        <StatsView />
                    </div>
                )}
            </div>

            {showPlans && <PlanManager onClose={() => setShowPlans(false)} />}
            {activeRestDay && (
                <QuickLogModal
                    onClose={() => setActiveRestDay(null)}
                    activePlanId={activePlan.id}
                    dayId={activeRestDay.id}
                />
            )}
            <BottomNav />
        </div>
    );
}
