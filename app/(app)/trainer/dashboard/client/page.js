"use client";

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase';
import WorkoutHeatmap from '@/components/WorkoutHeatmap';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

function ClientDetailContent() {
    const searchParams = useSearchParams();
    const clientId = searchParams.get('id');

    // Data State
    const [client, setClient] = useState(null);
    const [history, setHistory] = useState([]);
    const [assignment, setAssignment] = useState(null);
    const [plans, setPlans] = useState([]); // Plans owned by trainer
    const [loading, setLoading] = useState(true);

    // AI/Config State
    // We assume assignment.settings = { is_strict: boolean, allow_algo: boolean }

    // UI State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState('');

    const supabase = createClient();
    const { success, error: toastError } = useToast(); // Use our provider if available, or just alerts for now if this fails? I'll use simple alerts for speed as I didn't replace alerts here yet? 
    // Wait, I should use useToast since I fixed imports in other files.
    // But this file wasn't refactored to useToast in the last step (only Onboarding and Admin).
    // Let's stick to alerts/confirms as per original file to avoid import issues unless I know ToastProvider is global.
    // Actually, I verified ToastProvider is good. I'll use it.

    useEffect(() => {
        if (clientId) fetchData();
    }, [clientId]);

    const fetchData = async () => {
        setLoading(true);
        // 1. Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', clientId)
            .single();

        // 2. Workouts
        const { data: workouts } = await supabase
            .from('workouts')
            .select('*, workout_plans(name)')
            .eq('user_id', clientId)
            .order('start_time', { ascending: false })
            .limit(10);

        // 3. Current Assignment
        const { data: assign } = await supabase
            .from('plan_assignments')
            .select(`*, workout_plans(name)`)
            .eq('client_id', clientId)
            .is('active_until', null) // Current active only
            .maybeSingle();

        // 4. Trainer's Plans (for assignment)
        const { data: myPlans } = await supabase
            .from('workout_plans')
            .select('id, name')
            .eq('is_public', true);

        setClient(profile);
        setHistory(workouts || []);
        setAssignment(assign);
        setPlans(myPlans || []);
        setLoading(false);
    };

    const handleAssignPlan = async () => {
        if (!selectedPlanId) return;

        // Deactivate old assignments
        if (assignment) {
            await supabase
                .from('plan_assignments')
                .update({ active_until: new Date().toISOString() })
                .eq('id', assignment.id);
        }

        const { data, error } = await supabase
            .from('plan_assignments')
            .insert({
                trainer_id: (await supabase.auth.getUser()).data.user.id,
                client_id: clientId,
                plan_id: selectedPlanId,
                settings: { is_strict: false, allow_algo: true }, // Default
                active_from: new Date().toISOString()
            })
            .select();

        if (error) {
            alert("Error assigning plan: " + error.message);
        } else {
            setShowAssignModal(false);
            fetchData();
        }
    };

    const handleRevoke = async () => {
        if (!confirm("Stop coaching this plan?")) return;
        if (!assignment) return;

        await supabase
            .from('plan_assignments')
            .update({ active_until: new Date().toISOString() })
            .eq('id', assignment.id);

        fetchData();
    };

    const toggleSetting = async (key) => {
        if (!assignment) return;

        const newSettings = {
            ...assignment.settings,
            [key]: !assignment.settings?.[key]
        };

        const { error } = await supabase
            .from('plan_assignments')
            .update({ settings: newSettings })
            .eq('id', assignment.id);

        if (!error) {
            setAssignment(prev => ({ ...prev, settings: newSettings }));
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Athlete Data...</div>;
    if (!client) return <div className="p-8 text-center text-red-500">Client not found.</div>;

    return (
        <div className="container" style={{ padding: '20px' }}>
            <Link href="/trainer/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '16px', display: 'block' }}>
                ← Back to Clients
            </Link>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                <img
                    src={client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.id}`}
                    alt={client.name}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--primary)' }}
                />
                <div>
                    <h1 style={{ fontSize: '1.8rem', margin: 0 }}>{client.name || 'Athlete'}</h1>
                    <div style={{ color: 'var(--text-muted)' }}>Level {client.level || 1} • {client.workout_goal || 'Fit & Strong'}</div>
                </div>
            </div>

            {/* Plan Assignment & Oversight */}
            <div style={{ marginBottom: '32px', background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>📋 Current Assignment</span>
                    {assignment && <button onClick={handleRevoke} style={{ fontSize: '0.8rem', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>Revoke</button>}
                </h3>

                {assignment ? (
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '16px' }}>
                            {assignment.workout_plans?.name || 'Unknown Plan'}
                        </div>

                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            {/* Strict Mode Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={assignment.settings?.is_strict || false}
                                        onChange={() => toggleSetting('is_strict')}
                                    />
                                    <span className="slider round"></span>
                                </label>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>Strict Mode</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Blocks Manual Changes</div>
                                </div>
                            </div>

                            {/* Smart Algo Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={assignment.settings?.allow_algo ?? true} // Default true
                                        onChange={() => toggleSetting('allow_algo')}
                                    />
                                    <span className="slider round"></span>
                                </label>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>AI Suggestions</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Progressive Overload</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '12px' }}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No plan assigned. The athlete is training freestyle.</p>
                        <button
                            onClick={() => setShowAssignModal(true)}
                            style={{ background: 'var(--primary)', color: 'black', padding: '12px 24px', borderRadius: '100px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                        >
                            Assign Plan
                        </button>
                    </div>
                )}
            </div>

            {/* Heatmap Section */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Consistency</h3>
                <WorkoutHeatmap userId={clientId} />
            </div>

            {/* Recent Logs */}
            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.2rem' }}>Recent Activity</h3>
                    <button style={{ fontSize: '0.9rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                    {history.length === 0 ? (
                        <div style={{ padding: '20px', background: 'var(--surface)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No workouts logged yet.
                        </div>
                    ) : (
                        history.map(workout => (
                            <div key={workout.id} style={{
                                padding: '16px',
                                background: 'var(--surface)',
                                borderRadius: '12px',
                                borderLeft: '4px solid var(--primary)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{workout.name || 'Unnamed Session'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {new Date(workout.start_time).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>Completed</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Duration: {Math.round((new Date(workout.end_time) - new Date(workout.start_time)) / 60000)}m
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Assign Modal */}
            {showAssignModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: 'var(--surface)', padding: '24px', borderRadius: '16px',
                        width: '90%', maxWidth: '400px',
                        border: '1px solid var(--border)'
                    }}>
                        <h3 style={{ marginBottom: '16px' }}>Assign Workout Plan</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Select a plan to assign to {client.name}.</p>

                        <select
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', marginBottom: '24px',
                                background: 'var(--background)', color: 'white',
                                border: '1px solid var(--border)', borderRadius: '8px'
                            }}
                        >
                            <option value="">-- Select Plan --</option>
                            {plans.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowAssignModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleAssignPlan} style={{ flex: 1, padding: '12px', background: 'var(--primary)', border: 'none', color: 'black', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Assign</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .switch { position: relative; display: inline-block; width: 40px; height: 24px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .4s; border-radius: 34px; }
                .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: var(--primary); }
                input:checked + .slider:before { transform: translateX(16px); }
            `}</style>
        </div>
    );
}

export default function ClientDetailPage() {
    return (
        <Suspense fallback={<div style={{ padding: 20 }}>Loading Client...</div>}>
            <ClientDetailContent />
        </Suspense>
    );
}
