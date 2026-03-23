import { useState, useEffect } from 'react';
import { useTranslation } from '@/context/TranslationContext';
import { useToast } from '@/components/ToastProvider';
import { createClient } from '@/lib/supabase';

export default function ManageChallengeModal({ isOpen, onClose, challenge, onChallengeCompleted }) {
    const { t } = useTranslation();
    const [supabase] = useState(() => createClient());
    const toast = useToast();

    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        if (isOpen && challenge) {
            fetchLeaderboard();
        } else {
            setParticipants([]);
        }
    }, [isOpen, challenge]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            // Fetch participants linked to this challenge
            const { data: participantsData, error: participantsError } = await supabase
                .from('challenge_participants')
                .select(`
                    id, 
                    user_id, 
                    progress, 
                    team_id,
                    challenge_teams ( id, team_name )
                `)
                .eq('challenge_id', challenge.id)
                .order('progress', { ascending: false });

            if (participantsError) throw participantsError;

            if (participantsData && participantsData.length > 0) {
                const userIds = participantsData.map(p => p.user_id);
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, name, username, avatar_url')
                    .in('id', userIds);

                if (profileError) throw profileError;

                const profilesMap = {};
                profiles.forEach(p => { profilesMap[p.id] = p; });

                const mappedParticipants = participantsData.map(p => ({
                    ...p,
                    profiles: profilesMap[p.user_id] || null
                }));

                setParticipants(mappedParticipants);
            } else {
                setParticipants([]);
            }

        } catch (err) {
            console.error(err);
            toast.error(t('Failed to load participants.'));
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteChallenge = async () => {
        if (!confirm(t('Are you sure you want to end this challenge and distribute XP?'))) return;

        setCompleting(true);
        try {
            const { data, error } = await supabase.rpc('complete_challenge_and_award_xp', {
                p_challenge_id: challenge.id
            });

            if (error) throw error;

            if (data && data.success) {
                toast.success(data.message);
                if (onChallengeCompleted) onChallengeCompleted();
                onClose();
            } else {
                toast.error(data?.message || t('Failed to complete challenge'));
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message);
        } finally {
            setCompleting(false);
        }
    };

    if (!isOpen || !challenge) return null;

    const isActive = challenge._status === 'Active' || new Date(challenge.end_date) > new Date() || !challenge.end_date;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--surface)', width: '100%', maxWidth: '600px',
                borderRadius: '16px', padding: '32px', border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '90vh'
            }} onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {challenge.title}
                        </h2>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                            {t('Manage & View Leaderboard')}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                {/* Info Card */}
                <div style={{ background: 'var(--background)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ color: 'var(--success)' }}>🥇 1st: {challenge.xp_reward_1st} XP</div>
                        <div style={{ color: '#C0C0C0' }}>🥈 2nd: {challenge.xp_reward_2nd} XP</div>
                        <div style={{ color: '#CD7F32' }}>🏅 Par: {challenge.xp_reward_participation} XP</div>
                    </div>
                    {challenge.target_value && (
                        <div style={{ color: 'var(--brand-yellow)', fontWeight: 'bold' }}>
                            🎯 {t('Goal')}: {challenge.target_value} {challenge.target_unit || ''}
                        </div>
                    )}
                </div>

                {/* Submissions / Leaderboard */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>{t('Leaderboard')}</h3>

                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>{t('Loading...')}</div>
                    ) : participants.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#888', padding: '20px', fontStyle: 'italic' }}>
                            {t('No participants have joined yet.')}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {participants.map((p, index) => (
                                <div key={p.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    background: 'var(--background)', padding: '12px', borderRadius: '8px',
                                    borderLeft: `4px solid ${index === 0 ? 'var(--success)' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'transparent'}`
                                }}>
                                    <div style={{ fontWeight: 'bold', width: '24px', textAlign: 'center', color: '#888' }}>
                                        {index + 1}.
                                    </div>
                                    <img
                                        src={p.profiles?.avatar_url || 'https://via.placeholder.com/40'}
                                        alt="Avatar"
                                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold' }}>{p.profiles?.name || p.profiles?.username || t('Unknown User')}</div>
                                        {p.challenge_teams && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>🛡️ {p.challenge_teams.team_name}</div>
                                        )}
                                    </div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--brand-yellow)', fontSize: '1.1rem' }}>
                                        {p.progress || 0} <span style={{ fontSize: '0.8rem', color: '#888' }}>{challenge.target_unit || ''}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ marginTop: '16px' }}>
                    <button
                        onClick={handleCompleteChallenge}
                        disabled={completing || participants.length === 0}
                        style={{
                            width: '100%', padding: '16px',
                            background: completing ? '#555' : 'var(--success)',
                            border: 'none', color: '#000', borderRadius: '12px',
                            fontWeight: 'bold', fontSize: '1.1rem', cursor: completing || participants.length === 0 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: (completing || participants.length === 0) ? 0.5 : 1
                        }}
                    >
                        {completing ? t('Completing...') : t('Complete Challenge & Distribute XP')}
                    </button>
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', marginTop: '8px' }}>
                        {t('This action distributes XP based on rankings and marks the challenge as "Completed".')}
                    </div>
                </div>

            </div>
        </div>
    );
}
