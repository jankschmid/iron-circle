"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';
import TemplateSelector from '@/components/TemplateSelector';
import WorkoutActive from '@/components/WorkoutActive';
import BottomNav from '@/components/BottomNav';
import StatsView from '@/components/StatsView';

export default function WorkoutPage() {
    const { activeWorkout } = useStore();
    const [view, setView] = useState('workout'); // 'workout' | 'stats'

    if (activeWorkout) {
        return <WorkoutActive />;
    }

    return (
        <div style={{ paddingBottom: '100px', minHeight: '100vh', background: 'var(--background)' }}>
            {/* Header Tabs */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 100, // High z-index to stay above content
                background: 'var(--background)',
                padding: '20px 20px 10px',
                borderBottom: '1px solid var(--border)'
            }}>
                <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'var(--surface)', borderRadius: '100px' }}>
                    <button
                        onClick={() => setView('workout')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '100px',
                            border: 'none',
                            background: view === 'workout' ? 'var(--primary)' : 'transparent',
                            color: view === 'workout' ? '#000' : 'var(--text-muted)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Workout
                    </button>
                    <button
                        onClick={() => setView('stats')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '100px',
                            border: 'none',
                            background: view === 'stats' ? 'var(--primary)' : 'transparent',
                            color: view === 'stats' ? '#000' : 'var(--text-muted)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Stats
                    </button>
                </div>
            </div>

            {/* Content */}
            <div style={{ paddingTop: '20px' }}>
                {view === 'workout' ? (
                    // TemplateSelector already has container class and heavy top padding
                    // We might need to override the top padding if possible, or just accept it
                    <div style={{ marginTop: '-40px' }}>
                        <TemplateSelector />
                    </div>
                ) : (
                    <div className="container">
                        <StatsView />
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
