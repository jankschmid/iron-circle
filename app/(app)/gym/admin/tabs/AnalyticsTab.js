import { downloadCSV } from '@/lib/csv';
import { useTranslation } from '@/context/TranslationContext';

export default function AnalyticsTab({ members, gym, setActiveTab, setBroadcastStartAudience }) {
    const { t } = useTranslation();
    // 1. Calculate At-Risk Members
    const now = new Date();
    const atRiskMembers = members.filter(m => {
        if (!m.last_workout_date && !m.current_xp) return true; // Brand new or totally inactive
        if (!m.last_workout_date) return false;

        const lastWorkout = new Date(m.last_workout_date);
        const daysSince = (now - lastWorkout) / (1000 * 60 * 60 * 24);
        return daysSince > 14;
    });

    // 2. Leaderboards (Top 5 all-time volume proxy for activity)
    const volumeLeaderboard = [...members].sort((a, b) => (b.lifetime_volume || 0) - (a.lifetime_volume || 0)).slice(0, 5);

    const handleExport = () => {
        const exportData = members.map(m => ({
            [t("Member Name")]: m.name || m.username || t('Unknown'),
            [t("Role")]: t(m.role),
            [t("Joined At")]: new Date(m.joined_at).toISOString().split('T')[0],
            [t("Last Workout")]: m.last_workout_date ? new Date(m.last_workout_date).toISOString().split('T')[0] : t('N/A'),
            [t("Current Streak")]: m.current_streak || 0,
            [t("Total Volume (kg)")]: m.lifetime_volume || 0,
            [t("Total XP")]: m.current_xp || 0
        }));
        downloadCSV(exportData, `${gym.name}_Members_Export.csv`);
    };

    return (
        <div style={{ maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '8px', fontWeight: 'bold' }}>{t('Analytics & Retention')}</h2>
                    <p style={{ color: '#888', margin: 0 }}>{t('Monitor member health and community leaderboards.')}</p>
                </div>
                <button onClick={handleExport} style={{ background: '#FFC800', color: '#000', fontWeight: 'bold', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⬇ {t('Export to CSV')}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {/* Churn Radar */}
                <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #ff444433' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                        <h3 style={{ margin: 0, color: '#ff4444' }}>{t('At-Risk Radar')}</h3>
                        <span style={{ marginLeft: 'auto', background: '#300', color: '#ff4444', padding: '4px 8px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold' }}>{atRiskMembers.length} {t('Members')}</span>
                    </div>

                    <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{t('Members who have not worked out in over 14 days.')}</span>
                        {/* Broadcast to All button removed since it's now handled in BroadcastTab */}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', borderTop: '1px solid #333', paddingTop: '16px' }}>
                        {atRiskMembers.length > 0 ? atRiskMembers.slice(0, 10).map(m => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <img src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.id}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                    <span style={{ fontWeight: 'bold' }}>{m.name || m.username || t('Anonymous')}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ color: '#ff4444', fontSize: '0.85rem', textAlign: 'right' }}>
                                        <div>{t('Last Active:')}</div>
                                        <div>{m.last_workout_date ? new Date(m.last_workout_date).toLocaleDateString() : t('Never')}</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setBroadcastStartAudience('at_risk');
                                            setActiveTab('broadcast');
                                        }}
                                        style={{ background: 'transparent', color: '#FFC800', border: '1px solid #FFC800', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                    >
                                        {t('Engage')}
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div style={{ color: '#0f0', textAlign: 'center', padding: '24px' }}>{t('All active members are consistently working out!')}</div>
                        )}
                        {atRiskMembers.length > 10 && <div style={{ textAlign: 'center', color: '#888', fontSize: '0.8rem' }}>+ {atRiskMembers.length - 10} {t('more')}</div>}
                    </div>
                </div>

                {/* Leaderboard */}
                <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🏆</span>
                        <h3 style={{ margin: 0, color: '#FFC800' }}>{t('Gym Leaderboard')}</h3>
                        <span style={{ marginLeft: 'auto', color: '#888', fontSize: '0.8rem' }}>{t('By Total Volume')}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {volumeLeaderboard.map((m, idx) => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: idx === 0 ? '#332b00' : '#1a1a1a', border: idx === 0 ? '1px solid #FFC800' : 'none', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '24px', textAlign: 'center', fontWeight: 'bold', color: idx === 0 ? '#FFC800' : '#888' }}>#{idx + 1}</div>
                                    <img src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.id}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                    <span style={{ fontWeight: 'bold' }}>{m.name || m.username || t('Anonymous')}</span>
                                </div>
                                <div style={{ color: '#FFC800', fontWeight: 'bold' }}>
                                    {(m.lifetime_volume || 0).toLocaleString()} kg
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
