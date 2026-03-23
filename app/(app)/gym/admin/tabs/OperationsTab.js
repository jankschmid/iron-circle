import Link from 'next/link';
import StatCard from '../components/StatCard';
import { useTranslation } from '@/context/TranslationContext';

export default function OperationsTab({
    stats, gym, origin, connectingTv, handleLinkTv,
    monitors, handleDisconnectMonitor, regenerateKey,
    community, handleCreateCommunity
}) {
    const { t } = useTranslation();
    return (
        <div style={{ maxWidth: '900px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '24px', fontWeight: 'bold' }}>{t('Operations')}</h2>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <StatCard label={t("Live Now")} value="-" icon="🔴" highlight note={t("(Check Monitor Below)")} />
                <StatCard label={t("Visits Today")} value={stats.todayVisits} icon="🔥" />
            </div>

            {/* Monitor Config */}
            <section style={{ marginBottom: '40px', background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{t('Step 1: Live Monitor')}</h3>
                    <Link
                        href={`/gym/display?id=${gym.id}`}
                        target="_blank"
                        style={{ background: '#222', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem' }}
                    >
                        {t('Open Web Link')} ↗
                    </Link>
                </div>

                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                    {/* Option A: TV Pairing */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h4 style={{ color: '#FFC800', marginBottom: '12px' }}>{t('Option A: Smart TV (Recommended)')}</h4>
                        <p style={{ color: '#888', marginBottom: '16px', fontSize: '0.9rem' }}>
                            {t('Open')} <strong>{origin}/tv</strong> {t('on your Gym TV and enter the code shown there:')}
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <input
                                id="tv-code-input"
                                type="text"
                                placeholder={t("Ex: A7X-9P2")}
                                maxLength={7}
                                disabled={connectingTv}
                                style={{
                                    background: connectingTv ? '#222' : '#000',
                                    border: '1px solid #333', color: connectingTv ? '#666' : '#fff',
                                    padding: '12px', borderRadius: '8px', flex: 1,
                                    fontSize: '1.2rem', fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleLinkTv();
                                }}
                            />
                            <button
                                onClick={handleLinkTv}
                                disabled={connectingTv}
                                style={{
                                    background: connectingTv ? '#444' : '#FFC800',
                                    color: connectingTv ? '#888' : '#000',
                                    border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 'bold', cursor: connectingTv ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {connectingTv ? t('Connecting...') : t('Connect')}
                            </button>
                        </div>

                        {/* Connected Monitors List */}
                        {monitors.length > 0 && (
                            <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '16px' }}>
                                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('Connected Screens')}</div>
                                {monitors.map(m => (
                                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#222', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                                        <div>
                                            <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>{t('TV')} {m.pairing_code}</div>
                                            <div style={{ color: '#888', fontSize: '0.8rem' }}>{t('Active • Connected')} {new Date(m.updated_at).toLocaleDateString()}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDisconnectMonitor(m.id)}
                                            style={{ background: '#330000', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            {t('Disconnect')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', background: '#222' }}></div>

                    {/* Option B: Key */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h4 style={{ color: '#fff', marginBottom: '12px' }}>{t('Option B: Manual Key')}</h4>
                        <p style={{ color: '#888', marginBottom: '16px', fontSize: '0.9rem' }}>
                            {t('Legacy: Connect a TV screen to')} <strong>{origin}/gym/display?id={gym.id}</strong> {t('and enter this key:')}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', background: '#000', padding: '10px', borderRadius: '8px', border: '1px solid #333' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px', color: '#888', flex: 1 }}>
                                {gym.display_key || '----'}
                            </div>
                            <button onClick={regenerateKey} style={{ background: '#222', border: 'none', color: '#fff', padding: '0 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>{t('Regen')}</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* QR Code / Check-in */}
            <section style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222' }}>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 20px 0' }}>{t('Step 2: Member Check-in')}</h3>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px' }}>
                        {/* Simple QR Code to Gym Page */}
                        {/* In a real app, generate this robustly. Here using an API for immediate result. */}
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${origin}/community?id=${community?.id}`)}`}
                            alt="Gym QR"
                            style={{ display: 'block' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            {t('Print this QR Code and place it at your front desk. Members scan it to')} <strong>{t('Join the Community')}</strong> {t('and unlock the Monitor.')}
                        </p>
                        {!community && (
                            <div style={{ padding: '12px', background: 'rgba(255,0,0,0.1)', border: '1px solid red', borderRadius: '8px', color: '#ffaaaa' }}>
                                ⚠️ {t('No Community Linked!')}
                                <button onClick={handleCreateCommunity} style={{ marginLeft: '12px', background: '#d00', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>{t('Create Now')}</button>
                            </div>
                        )}
                        {community && <div style={{ color: '#0f0', fontSize: '0.9rem' }}>✅ {t('Community Active:')} {community.name}</div>}
                    </div>
                </div>
            </section>
        </div>
    );
}
