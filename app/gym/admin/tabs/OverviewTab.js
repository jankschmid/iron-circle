import StatCard from '../components/StatCard';
import { useTranslation } from '@/context/TranslationContext';

export default function OverviewTab({ gym, members, stats, contentData, monitors, setActiveTab }) {
    const { t } = useTranslation();
    return (
        <div style={{ maxWidth: '1000px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px', fontWeight: 'bold' }}>{t('Dashboard Overview')}</h2>
            <p style={{ color: '#888', marginBottom: '32px' }}>{t('High-level insights on community engagement for')} {gym.name}.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <StatCard label={t("App Members")} value={members.length} icon="👥" highlight={true} note={t("Linked to this Gym")} />
                <StatCard label={t("Today's Check-ins")} value={stats.todayVisits} icon="⚡" note={t("Tracked Workouts")} />
                <StatCard label={t("Active Challenges")} value={contentData.challenges.length} icon="🏆" note={t("Driving Engagement")} />
                <StatCard label={t("Connected Screens")} value={monitors.length} icon="📺" note={t("Live TV Displays")} />
            </div>

            {/* Recent Activity Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222' }}>
                    <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #333', paddingBottom: '12px' }}>{t('Upcoming Events')}</h3>
                    {contentData.events.length > 0 ? (
                        contentData.events.slice(0, 3).map(ev => (
                            <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #222' }}>
                                <span>{ev.title}</span>
                                <span style={{ color: '#FFC800' }}>{new Date(ev.event_date).toLocaleDateString()}</span>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: '#666', fontStyle: 'italic', fontSize: '0.9rem' }}>{t('No events scheduled.')}</p>
                    )}
                    <button onClick={() => setActiveTab('content')} style={{ marginTop: '16px', background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>{t('Manage Events')} →</button>
                </div>

                <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222' }}>
                    <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #333', paddingBottom: '12px' }}>{t('Recent News')}</h3>
                    {contentData.news.length > 0 ? (
                        contentData.news.slice(0, 3).map(nw => (
                            <div key={nw.id} style={{ padding: '12px 0', borderBottom: '1px solid #222' }}>
                                <div style={{ fontWeight: 'bold' }}>{nw.title}</div>
                                <div style={{ color: '#888', fontSize: '0.85rem' }} className="truncate-text">{nw.content?.substring(0, 60)}...</div>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: '#666', fontStyle: 'italic', fontSize: '0.9rem' }}>{t('No news posted.')}</p>
                    )}
                    <button onClick={() => setActiveTab('content')} style={{ marginTop: '16px', background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>{t('Manage News')} →</button>
                </div>
            </div>
        </div>
    );
}
