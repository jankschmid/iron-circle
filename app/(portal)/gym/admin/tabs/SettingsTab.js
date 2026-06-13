import { useState } from 'react';
import { useTranslation } from '@/context/TranslationContext';
import { useToast } from '@/components/ToastProvider';

export default function SettingsTab({ gym, supabase, fetchGymDetails }) {
    const { t } = useTranslation();
    const toast = useToast();
    const [duration, setDuration] = useState('2'); // hours
    const [loading, setLoading] = useState(false);

    const handleGrantSupport = async () => {
        setLoading(true);
        try {
            const hours = parseInt(duration);
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + hours);

            const { error } = await supabase
                .from('gyms')
                .update({
                    support_access_active: true,
                    support_expires_at: expiresAt.toISOString()
                })
                .eq('id', gym.id);

            if (error) throw error;

            toast.success(t("Support access granted for") + ` ${hours} ` + t("hours"));
            if (fetchGymDetails) fetchGymDetails();
        } catch (err) {
            toast.error(t("Failed to grant support access") + ": " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeSupport = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('gyms')
                .update({
                    support_access_active: false,
                    support_expires_at: null
                })
                .eq('id', gym.id);

            if (error) throw error;

            toast.success(t("Support access revoked"));
            if (fetchGymDetails) fetchGymDetails();
        } catch (err) {
            toast.error(t("Failed to revoke support access") + ": " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '24px' }}>{t('Gym Settings')}</h2>
            
            <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222', marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>{t('Gym Name')}</label>
                    <input type="text" defaultValue={gym.name} disabled style={{ width: '100%', padding: '12px', background: '#222', border: 'none', color: '#666', borderRadius: '8px' }} />
                    <div style={{ fontSize: '0.8rem', color: '#444', marginTop: '4px' }}>{t('Contact Super Admin to change name')}</div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>{t('Address')}</label>
                    <input type="text" defaultValue={gym.address} disabled style={{ width: '100%', padding: '12px', background: '#222', border: 'none', color: '#666', borderRadius: '8px' }} />
                </div>
            </div>

            {/* Support Access Section */}
            <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🛡️ {t('Developer Support Access')}
                </h3>
                <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '24px' }}>
                    {t('Grant Iron Circle developers temporary administrative access to this Gym to help troubleshoot issues. This access is securely audited.')}
                </p>

                {gym.support_access_active ? (
                    <div style={{ background: 'rgba(255, 200, 0, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid #FFC800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ color: '#FFC800', fontWeight: 'bold', marginBottom: '4px' }}>{t('Support Access is Active')}</div>
                            <div style={{ color: '#aaa', fontSize: '0.8rem' }}>
                                {t('Expires at')}: {new Date(gym.support_expires_at).toLocaleString()}
                            </div>
                        </div>
                        <button 
                            onClick={handleRevokeSupport}
                            disabled={loading}
                            style={{ background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
                        >
                            {t('Revoke Now')}
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>{t('Duration')}</label>
                            <select 
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                style={{ width: '100%', padding: '12px', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '8px' }}
                            >
                                <option value="2">2 {t('Hours')}</option>
                                <option value="24">24 {t('Hours')} (1 {t('Day')})</option>
                                <option value="168">168 {t('Hours')} (7 {t('Days')})</option>
                            </select>
                        </div>
                        <button 
                            onClick={handleGrantSupport}
                            disabled={loading}
                            style={{ background: '#FFC800', color: '#000', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', height: '42px', display: 'flex', alignItems: 'center' }}
                        >
                            {loading ? '...' : t('Grant Access')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
