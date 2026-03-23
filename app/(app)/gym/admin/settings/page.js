"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ToastProvider';

export default function GymAdminSettings() {
    const { user } = useStore();
    const supabase = createClient();
    const { success, error: toastError } = useToast();

    const [gym, setGym] = useState(null);
    const [loading, setLoading] = useState(true);
    const [codesVisible, setCodesVisible] = useState(false);

    useEffect(() => {
        if (!user) return;
        fetchAdminGym();
    }, [user]);

    const fetchAdminGym = async () => {
        // Find the gym where user is an admin/owner
        const adminGymRef = user.gyms?.find(g => g.role === 'admin' || g.role === 'owner');

        if (!adminGymRef) {
            setLoading(false);
            return;
        }

        // Fetch Gym Details including codes
        // Note: access_code_trainer/admin columns are on the 'gyms' table.
        // We need to fetch from 'gyms' directly.
        const { data, error } = await supabase
            .from('gyms')
            .select('*')
            .eq('id', adminGymRef.id)
            .single();

        if (error) {
            console.error(error);
            toastError("Failed to load gym settings.");
        } else {
            setGym(data);
        }
        setLoading(false);
    };

    const handleRegenerate = async () => {
        if (!confirm("Are you sure? Old codes will stop working immediately.")) return;
        if (!gym) return;

        const { error } = await supabase.rpc('regenerate_gym_codes', { p_gym_id: gym.id });

        if (error) {
            toastError("Error: " + error.message);
        } else {
            success("Codes regenerated!");
            fetchAdminGym(); // Refresh
        }
    };

    if (loading) return <div className="p-8">Loading Settings...</div>;
    if (!gym) return <div className="p-8">Access Denied. You are not an Admin of any gym.</div>;

    return (
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Gym Settings</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>{gym.name}</p>

            {/* Access Codes Card */}
            <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Staff Access Codes</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Share these codes with new staff members during onboarding.
                        </p>
                    </div>
                    <button
                        onClick={handleRegenerate}
                        style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        Regenerate
                    </button>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>

                    {/* Trainer Code */}
                    <div style={{ background: 'var(--background)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Trainer Code</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--secondary)' }}>
                                {codesVisible ? gym.access_code_trainer : '••••••••••'}
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(gym.access_code_trainer);
                                    success("Copied!");
                                }}
                                style={{ background: 'var(--surface-highlight)', border: 'none', padding: '8px', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    {/* Admin Code */}
                    <div style={{ background: 'var(--background)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Admin Code</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--primary)' }}>
                                {codesVisible ? gym.access_code_admin : '••••••••••'}
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(gym.access_code_admin);
                                    success("Copied!");
                                }}
                                style={{ background: 'var(--surface-highlight)', border: 'none', padding: '8px', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setCodesVisible(!codesVisible)}
                        style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {codesVisible ? 'Hide Codes' : 'Show Codes'}
                    </button>
                </div>
            </div>

            {/* Team Link */}
            <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Team Management</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>View and manage current staff members.</p>
                <a
                    href="/gym/admin/settings/team"
                    style={{ display: 'inline-block', padding: '12px 24px', background: 'var(--surface-highlight)', color: 'white', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}
                >
                    Manage Team →
                </a>
            </div>
        </div>
    );
}
