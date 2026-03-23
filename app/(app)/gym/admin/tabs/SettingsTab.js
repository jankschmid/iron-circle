import { useTranslation } from '@/context/TranslationContext';

export default function SettingsTab({ gym }) {
    const { t } = useTranslation();
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
        </div>
    );
}
