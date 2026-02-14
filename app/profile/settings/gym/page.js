"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useTranslation } from '@/context/TranslationContext';

export default function GymSettingsPage() {
    const { user } = useStore();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const supabase = createClient();

    const [inviteCode, setInviteCode] = useState('');
    const [trainerCode, setTrainerCode] = useState('');
    const [currentTrainer, setCurrentTrainer] = useState(null);

    useEffect(() => {
        if (user) fetchTrainer();
    }, [user]);

    const fetchTrainer = async () => {
        // Fetch active trainer relationship
        // We need to join with profiles to get trainer details
        const { data, error } = await supabase
            .from('trainer_relationships')
            .select('trainer_id, status')
            .eq('client_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

        if (data && data.trainer_id) {
            // Fetch profile manually to be safe if Relation match fails
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.trainer_id)
                .single();
            if (profile) setCurrentTrainer(profile);
        } else {
            setCurrentTrainer(null);
        }
    };

    if (!user) return <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Loading...</div>;

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/profile/settings" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>Gym & Team</h1>
            </header>

            <div style={{ maxWidth: '100%', margin: '0 auto' }}>
                {message && (
                    <div style={{
                        background: 'rgba(0, 230, 118, 0.1)',
                        border: '1px solid var(--success)',
                        color: 'var(--success)',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '24px'
                    }}>
                        {message}
                    </div>
                )}
                {error && (
                    <div style={{
                        background: 'rgba(255, 23, 68, 0.1)',
                        border: '1px solid var(--error)',
                        color: 'var(--error)',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '24px'
                    }}>
                        {error}
                    </div>
                )}

                {/* CURRENT GYMS */}
                <section style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-muted)' }}>{t('My Gyms')}</h3>
                    {user.gyms && user.gyms.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {user.gyms.map((g, i) => (
                                <div key={i} style={{
                                    padding: '16px', background: 'var(--surface)',
                                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{g.name || g.label || t('Unknown Gym')}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{g.address || t('Member')}</div>
                                    </div>
                                    {g.isDefault && <span style={{ fontSize: '0.8rem', background: 'var(--primary)', color: '#000', padding: '4px 8px', borderRadius: '4px' }}>{t('Main')}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                            {t('No gyms joined yet.')}
                        </div>
                    )}
                    <Link href="/tracker?manage=true&returnTo=/profile/settings/gym" style={{ textDecoration: 'none' }}>
                        <button style={{
                            width: '100%',
                            marginTop: '16px',
                            padding: '12px',
                            background: 'var(--surface-highlight)',
                            color: 'var(--primary)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}>
                            {t('Manage / Add Gyms')}
                        </button>
                    </Link>
                </section>

                {/* TRAINER CONNECTION */}
                <section style={{ marginBottom: '32px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--secondary)' }}>{t('My Personal Trainer')}</h3>

                    {currentTrainer ? (
                        <div style={{
                            padding: '16px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'center'
                        }}>
                            <img
                                src={currentTrainer.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentTrainer.id}`}
                                style={{ width: '56px', height: '56px', borderRadius: '50%' }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{currentTrainer.name || currentTrainer.username || t('Unknown Trainer')}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{currentTrainer.username}</div>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!confirm(t('Are you sure you want to leave this squad?'))) return;
                                    setIsLoading(true);
                                    try {
                                        const { error } = await supabase
                                            .from('trainer_relationships')
                                            .delete() // As client we can just leave? Or update to 'archived'? 
                                            // Ideally we update status to 'archived' or 'rejected' or just delete row. 
                                            // Let's delete for now to allow re-joining easily.
                                            .eq('trainer_id', currentTrainer.id)
                                            .eq('client_id', user.id);

                                        if (error) throw error;
                                        setCurrentTrainer(null);
                                        setMessage(t('You have left the squad.'));
                                    } catch (e) {
                                        console.error(e);
                                        setError(e.message);
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                                style={{
                                    padding: '8px 16px',
                                    background: 'rgba(255, 23, 68, 0.1)',
                                    color: 'var(--error)',
                                    border: '1px solid var(--error)',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                {t('Leave')}
                            </button>
                        </div>
                    ) : (
                        <>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                {t("Enter your Coach's unique code to join their client roster.")}
                            </p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    placeholder={t("Code (e.g. TR-123...)")}
                                    value={trainerCode}
                                    onChange={(e) => setTrainerCode(e.target.value.toUpperCase())}
                                    style={inputStyle}
                                />
                                <button
                                    onClick={async () => {
                                        if (!trainerCode) return;
                                        setIsLoading(true);
                                        setMessage(null);
                                        setError(null);
                                        try {
                                            const { data, error } = await supabase.rpc('join_trainer_with_code', { p_code: trainerCode });
                                            if (error) throw error;
                                            if (!data.success) throw new Error(data.message);

                                            setMessage(t('Success! You are now a client of ') + data.trainer_name);
                                            setTrainerCode('');
                                            fetchTrainer(); // Refresh
                                        } catch (e) {
                                            setError(e.message);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    disabled={isLoading || !trainerCode}
                                    style={{
                                        padding: '0 24px',
                                        background: 'var(--secondary)',
                                        color: '#000',
                                        fontWeight: 'bold',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        opacity: !trainerCode ? 0.5 : 1
                                    }}
                                >
                                    {t('Connect')}
                                </button>
                            </div>
                        </>
                    )}
                </section>

                {/* STAFF ACCESS */}
                <section style={{ marginBottom: '32px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-muted)' }}>{t('Gym Team Access')}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        {t('If you have a Trainer or Admin invite code, enter it here to unlock dashboard access.')}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder={t("Code (e.g. GYM-ADM...)")}
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            style={inputStyle}
                        />
                        <button
                            onClick={async () => {
                                if (!inviteCode) return;
                                setIsLoading(true);
                                setMessage(null);
                                setError(null);
                                try {
                                    const { data, error } = await supabase.rpc('join_gym_with_code', { p_code: inviteCode });
                                    if (error) throw error;
                                    if (!data.success) throw new Error(data.message);

                                    setMessage(t('Success! You have joined ') + data.gym_name + t(' as ') + data.role.toUpperCase() + '.');
                                    setInviteCode('');
                                } catch (e) {
                                    setError(e.message);
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            disabled={isLoading || !inviteCode}
                            style={{
                                padding: '0 24px',
                                background: 'var(--primary)',
                                color: '#000',
                                fontWeight: 'bold',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                opacity: !inviteCode ? 0.5 : 1
                            }}
                        >
                            {t('Redeem')}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}

const inputStyle = {
    flex: 1,
    padding: '16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-main)',
    fontFamily: 'monospace',
    letterSpacing: '1px'
};
