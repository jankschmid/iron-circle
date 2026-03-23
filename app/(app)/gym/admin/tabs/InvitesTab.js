import { useTranslation } from '@/context/TranslationContext';

export default function InvitesTab({ handleCreateInvite, invites, handleDeleteInvite }) {
    const { t } = useTranslation();
    return (
        <div style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '8px', fontWeight: 'bold' }}>{t('Team Invitations')}</h2>
                    <div style={{ color: '#888' }}>
                        {t('Generate secure codes to invite Trainers and Admins to your team.')}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                {/* Trainer Invite Card */}
                <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222' }}>
                    <h3 style={{ color: '#FFC800', margin: '0 0 16px 0' }}>{t('Invite Trainer')}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button
                            onClick={() => handleCreateInvite('trainer', 'one_time')}
                            style={{ background: '#222', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            {t('Only Once')}
                        </button>
                        <button
                            onClick={() => handleCreateInvite('trainer', '24h')}
                            style={{ background: '#222', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            {t('Valid 24h')}
                        </button>
                    </div>
                </div>

                {/* Admin Invite Card */}
                <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222' }}>
                    <h3 style={{ color: '#ff4444', margin: '0 0 16px 0' }}>{t('Invite Admin')}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button
                            onClick={() => handleCreateInvite('admin', 'one_time')}
                            style={{ background: '#222', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            {t('Only Once')}
                        </button>
                        <button
                            onClick={() => handleCreateInvite('admin', '24h')}
                            style={{ background: '#222', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            {t('Valid 24h')}
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>{t('Active Invites')}</h3>
            <div style={{ background: '#111', borderRadius: '12px', border: '1px solid #222', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#181818', borderBottom: '1px solid #222' }}>
                        <tr>
                            <th style={{ padding: '16px', color: '#666', fontSize: '0.8rem' }}>{t('CODE')}</th>
                            <th style={{ padding: '16px', color: '#666', fontSize: '0.8rem' }}>{t('ROLE')}</th>
                            <th style={{ padding: '16px', color: '#666', fontSize: '0.8rem' }}>{t('TYPE')}</th>
                            <th style={{ padding: '16px', color: '#666', fontSize: '0.8rem' }}>{t('STATUS')}</th>
                            <th style={{ padding: '16px', color: '#666', fontSize: '0.8rem' }}>{t('ACTION')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invites.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#444' }}>{t('No active invites.')}</td></tr>
                        ) : invites.map(invite => {
                            const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
                            const isUsed = invite.max_uses && invite.used_count >= invite.max_uses;
                            const status = isExpired ? t('Expired') : isUsed ? t('Used') : t('Active');

                            return (
                                <tr key={invite.id} style={{ borderBottom: '1px solid #222' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px', color: status === t('Active') ? '#fff' : '#666' }}>
                                            {invite.code}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            color: invite.role === 'admin' ? '#000' : '#fff',
                                            background: invite.role === 'admin' ? '#ff4444' : '#0066ff',
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold'
                                        }}>{t(invite.role.toUpperCase())}</span>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '0.9rem', color: '#888' }}>
                                        {invite.max_uses === 1 ? t('One-Time') : invite.expires_at ? t('24 Hours') : t('Unlimited')}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ color: status === t('Active') ? '#0f0' : '#666' }}>{status}</span>
                                        {invite.expires_at && <div style={{ fontSize: '0.7rem', color: '#444' }}>{t('Expires:')} {new Date(invite.expires_at).toLocaleTimeString()}</div>}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <button onClick={() => handleDeleteInvite(invite.id)} style={{ color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer' }}>{t('Revoke')}</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
