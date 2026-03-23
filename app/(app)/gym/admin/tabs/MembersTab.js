import { useTranslation } from '@/context/TranslationContext';

export default function MembersTab({ members, setManageModal }) {
    const { t } = useTranslation();
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>{t('Member Management')}</h2>
                {/* <button style={{ background: '#fff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}>+ Invite</button> */}
            </div>

            <div style={{ background: '#111', borderRadius: '12px', border: '1px solid #222', overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ borderBottom: '1px solid #222', background: '#181818' }}>
                        <tr>
                            <th style={{ padding: '16px', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('User')}</th>
                            <th style={{ padding: '16px', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('Role')}</th>
                            <th style={{ padding: '16px', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('Joined')}</th>
                            <th style={{ padding: '16px', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Private Members Summary Row */}
                        {members.filter(m => m.isPrivate).length > 0 && (
                            <tr style={{ borderBottom: '1px solid #222', background: 'rgba(255, 255, 255, 0.05)' }}>
                                <td colSpan="4" style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#aaa', fontStyle: 'italic' }}>
                                        <span>🔒</span>
                                        <span>{t('Private Members:')} <strong>{members.filter(m => m.isPrivate).length}</strong></span>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{t('(Counted in total stats, but hidden from list)')}</span>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {members.filter(m => !m.isPrivate).length === 0 && members.filter(m => m.isPrivate).length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>{t('No members found.')}</td></tr>
                        ) : members.filter(m => !m.isPrivate).map(m => (
                            <tr key={m.id} style={{ borderBottom: '1px solid #222' }}>
                                <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {m.avatar_url ?
                                        <img src={m.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%' }} /> :
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#333' }} />
                                    }
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{m.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>@{m.username}</div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{
                                        background: ['admin', 'owner', 'super_admin'].includes(m.role) ? '#FFC800' : m.role === 'trainer' ? '#00f' : '#222',
                                        color: ['admin', 'owner', 'super_admin'].includes(m.role) ? '#000' : '#fff',
                                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'
                                    }}>
                                        {m.role === 'super_admin' ? t('App Owner') : (m.role ? t(m.role) : t('Member'))}
                                    </span>
                                </td>
                                <td style={{ padding: '16px', color: '#888', fontSize: '0.9rem' }}>
                                    {new Date(m.joined).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <button
                                        onClick={() => setManageModal({ isOpen: true, member: m })}
                                        style={{ background: 'transparent', border: '1px solid #333', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        {t('Manage')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
