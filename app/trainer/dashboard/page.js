"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Suspense } from 'react';

const TrainerDashboardContent = TrainerDashboard;

export default function TrainerDashboardWrapper() {
    return (
        <Suspense fallback={<div className="container" style={{ padding: '40px', textAlign: 'center' }}>Loading Coach Panel...</div>}>
            <TrainerDashboardContent />
        </Suspense>
    );
}

function TrainerDashboard() {
    const { user } = useStore();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const gymIdParam = searchParams.get('gymId');

    // If no gymId in URL, fallback to user's current gym or first gym they are trainer in
    // Real-world: Should probably let them select gym if they are trainer in multiple.

    const [members, setMembers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'inactive', 'new'

    useEffect(() => {
        if (!user) return;
        fetchMembers();
    }, [user, gymIdParam, filter]);

    const fetchMembers = async () => {
        setLoading(true);
        // We need to fetch community members for this gym
        // 1. Get Community ID for this gym
        const targetGymId = gymIdParam || user.gymId;
        if (!targetGymId) {
            setLoading(false);
            return;
        }

        try {
            // Get Community ID
            const { data: comm } = await supabase
                .from('communities')
                .select('id')
                .eq('gym_id', targetGymId)
                .single();

            if (!comm) throw new Error("No community found for this gym");

            // Get Members
            // Join profiles to get names
            let query = supabase
                .from('community_members')
                .select('joined_at, role, monitor_consent_at, profiles(id, name, avatar_url, last_start_workout)')
                .eq('community_id', comm.id);

            const { data, error } = await query;
            if (error) throw error;

            let processed = data.map(m => ({
                id: m.profiles.id,
                name: m.profiles.name,
                avatar: m.profiles.avatar_url,
                joinedAt: new Date(m.joined_at),
                lastWorkout: m.profiles.last_start_workout ? new Date(m.profiles.last_start_workout) : null,
                role: m.role,
                monitorConsent: !!m.monitor_consent_at
            }));

            // Client-side filtering for simplicity (since "Inactive > 7 days" is easier in JS)
            const now = new Date();
            const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

            if (filter === 'inactive') {
                processed = processed.filter(m => !m.lastWorkout || m.lastWorkout < sevenDaysAgo);
            } else if (filter === 'new') {
                processed = processed.filter(m => m.joinedAt > sevenDaysAgo);
            }

            setMembers(processed);
        } catch (err) {
            console.error("Trainer Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePushWorkout = (memberId) => {
        // Placeholder for "Assign Plan" functionality
        // In a real app, this would open a modal to select a template.
        alert(`Open Template Selector for member ${memberId.substr(0, 5)}...`);
    };

    return (
        <div className="container" style={{ paddingBottom: '100px', background: '#f5f5f7', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ background: '#fff', padding: '20px 20px 10px', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <Link href="/profile" style={{ fontSize: '1.5rem', textDecoration: 'none', color: '#000', marginRight: '16px' }}>←</Link>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '800' }}>Coach Panel</h1>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{members.length} Athletes Managed</p>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {['all', 'inactive', 'new'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '100px',
                                border: 'none',
                                background: filter === f ? '#000' : '#eee',
                                color: filter === f ? '#fff' : '#666',
                                fontWeight: '600',
                                textTransform: 'capitalize',
                                cursor: 'pointer'
                            }}
                        >
                            {f} {f === 'inactive' && '⚠️'} {f === 'new' && '✨'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div style={{ padding: '20px' }}>
                {loading ? <div style={{ textAlign: 'center', padding: '40px' }}>Loading Team...</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {members.map(member => (
                            <div key={member.id} style={{
                                background: '#fff', padding: '16px', borderRadius: '16px',
                                display: 'flex', alignItems: 'center', gap: '16px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                            }}>
                                <img src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`}
                                    style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#eee' }} />

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {member.name}
                                        {member.role === 'trainer' && <span style={{ fontSize: '0.7rem', background: '#FFC800', padding: '2px 6px', borderRadius: '4px' }}>COACH</span>}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                        Last: {member.lastWorkout ? new Date(member.lastWorkout).toLocaleDateString() : 'Never'}
                                    </div>
                                    {filter === 'inactive' && (
                                        <div style={{ fontSize: '0.75rem', color: '#ff3b30', fontWeight: 'bold' }}>
                                            ⚠️ Slackin' for {Math.floor((new Date() - member.lastWorkout) / (1000 * 60 * 60 * 24))} days
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handlePushWorkout(member.id)}
                                    style={{
                                        background: '#007AFF', color: '#fff', border: 'none',
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
