"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';

export default function ClaimGymPage() {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const router = useRouter();
    const [supabase] = useState(() => createClient());
    const { fetchUser } = useStore();

    const handleClaim = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            const { data, error: rpcError } = await supabase.rpc('join_gym_with_code', { p_code: code });

            if (rpcError) throw rpcError;
            
            if (!data.success) {
                throw new Error(data.message || 'Invalid or expired code.');
            }

            setSuccessMsg(`Success! You have joined ${data.gym_name} as ${data.role}.`);
            
            // Refresh user data globally so the nav picks up the new role
            const { data: { user } } = await supabase.auth.getUser();
            if (user) await fetchUser(user.id);

            // Redirect to gym dashboard
            setTimeout(() => {
                router.push('/gym/admin');
            }, 2000);

        } catch (err) {
            console.error("Claim Gym Error:", err);
            setError(err.message || 'An error occurred while validating the code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="portal-container" style={{ maxWidth: '600px', margin: '40px auto' }}>
            <div style={{ background: 'var(--surface)', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Claim Gym Access</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                    Enter your handover code (e.g., HO-XXXXXX) or invite code to gain access to a partner gym as an Admin or Trainer.
                </p>

                {error && (
                    <div style={{ background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', border: '1px solid var(--error)' }}>
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div style={{ background: 'rgba(0, 200, 83, 0.1)', color: 'var(--success, #00c853)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', border: '1px solid var(--success, #00c853)' }}>
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleClaim} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Access Code</label>
                        <input 
                            type="text" 
                            placeholder="HO-123456"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '16px', 
                                background: 'var(--background)', 
                                border: '1px solid var(--border)', 
                                borderRadius: 'var(--radius-md)', 
                                color: 'var(--text-main)',
                                fontSize: '1.2rem',
                                letterSpacing: '2px',
                                textTransform: 'uppercase'
                            }}
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading || !code.trim()}
                        style={{ 
                            background: 'var(--primary)', 
                            color: '#000', 
                            padding: '16px', 
                            borderRadius: 'var(--radius-md)', 
                            fontWeight: 'bold', 
                            fontSize: '1.1rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Validating...' : 'Claim Gym'}
                    </button>
                </form>
            </div>
        </div>
    );
}
