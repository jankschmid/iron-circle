import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { useState } from 'react';
import { useTranslation } from '@/context/TranslationContext';
import CreateEventModal from '@/components/CreateEventModal';
import CreateChallengeModal from '@/components/CreateChallengeModal';
import CreateNewsModal from '@/components/CreateNewsModal';
import CalendarPlanner from '@/components/CalendarPlanner';
import ManageChallengeModal from '@/components/ManageChallengeModal';

export default function TvContentTab({
    gymId,
    tvSettings, toggleTvFeature, handleDurationChange,
    contentData, handleAddNews, handleEditNews, handleDeleteContent,
    handleEditEvent, handleEditChallenge, // We ignore these props now
    setInputModal, fetchTvContent, supabase
}) {
    const toast = useToast();
    const { t } = useTranslation();

    const [isEventModalOpen, setEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState(null);

    const [isChallengeModalOpen, setChallengeModalOpen] = useState(false);
    const [challengeToEdit, setChallengeToEdit] = useState(null);

    const [isManageModalOpen, setManageModalOpen] = useState(false);
    const [challengeToManage, setChallengeToManage] = useState(null);

    const [isNewsModalOpen, setNewsModalOpen] = useState(false);
    const [newsToEdit, setNewsToEdit] = useState(null);

    const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'board'

    const handleSaveNews = async (newsData) => {
        if (newsToEdit) {
            const { error } = await supabase.from('gym_news').update(newsData).eq('id', newsToEdit.id);
            if (!error) toast.success(t("News updated"));
            else throw error;
        } else {
            const { error } = await supabase.from('gym_news').insert({ gym_id: gymId, ...newsData });
            if (!error) toast.success(t("News added"));
            else throw error;
        }
        fetchTvContent();
    };

    const handleSaveEvent = async (eventData) => {
        if (eventToEdit) {
            const { error } = await supabase.from('gym_events').update(eventData).eq('id', eventToEdit.id);
            if (!error) toast.success(t("Event updated"));
            else throw error;
        } else {
            const { error } = await supabase.from('gym_events').insert({ gym_id: gymId, ...eventData });
            if (!error) toast.success(t("Event added"));
            else throw error;
        }
        fetchTvContent();
    };

    const handleSaveChallenge = async (challengeData) => {
        const { admin_teams, ...coreChallengeData } = challengeData;
        let finalChallengeId = null;

        if (challengeToEdit) {
            const { error } = await supabase.from('gym_challenges').update(coreChallengeData).eq('id', challengeToEdit.id);
            if (!error) {
                toast.success(t("Challenge updated"));
                finalChallengeId = challengeToEdit.id;
            } else {
                throw error;
            }
        } else {
            const { data, error } = await supabase.from('gym_challenges').insert({ gym_id: gymId, ...coreChallengeData }).select('id').single();
            if (!error && data) {
                toast.success(t("Challenge added"));
                finalChallengeId = data.id;
            } else {
                throw error;
            }
        }

        // Handle Admin Defined Teams
        if (finalChallengeId) {
            if (coreChallengeData.team_type === 'admin_defined' && admin_teams && admin_teams.length > 0) {
                // Wipe and recreate teams for simplicity
                await supabase.from('challenge_teams').delete().eq('challenge_id', finalChallengeId);

                const teamsToInsert = admin_teams.map(name => ({
                    challenge_id: finalChallengeId,
                    team_name: name
                }));
                const { error: teamErr } = await supabase.from('challenge_teams').insert(teamsToInsert);
                if (teamErr) {
                    console.error("Error inserting custom teams:", teamErr);
                    toast.error(t("Challenge saved, but failed to create teams."));
                }
            } else if (coreChallengeData.team_type !== 'admin_defined') {
                // If they changed to a different mode, clear out any admin defined teams
                await supabase.from('challenge_teams').delete().eq('challenge_id', finalChallengeId);
            }
        }

        fetchTvContent();
    };

    return (
        <div style={{ maxWidth: '900px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '24px', fontWeight: 'bold' }}>{t('TV Content Management')}</h2>

            {/* 1. TV Configuration */}
            <section style={{ marginBottom: '40px', background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222' }}>
                <h3 style={{ margin: '0 0 16px', color: '#FFC800' }}>{t('Screen Configuration & Timing')}</h3>
                <p style={{ color: '#888', marginBottom: '16px', fontSize: '0.9rem' }}>{t('Select active screens and set duration (seconds) for each.')}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                    {['live', 'leaderboard', 'news', 'events', 'challenges', 'qr_checkin'].map(feat => {
                        const isEnabled = tvSettings.enabled_features?.includes(feat);
                        const duration = tvSettings.feature_durations?.[feat] || 20;

                        return (
                            <div key={feat} style={{
                                background: '#222', padding: '12px', borderRadius: '12px',
                                border: isEnabled ? '1px solid #FFC800' : '1px solid #333',
                                display: 'flex', flexDirection: 'column', gap: '12px'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                    <input
                                        type="checkbox"
                                        checked={isEnabled}
                                        onChange={() => toggleTvFeature(feat)}
                                    />
                                    {t(feat.replace('_', ' '))}
                                </label>

                                {isEnabled && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#888' }}>
                                        <span>{t('Duration:')}</span>
                                        <input
                                            type="number"
                                            min="5" max="300"
                                            value={duration}
                                            onChange={(e) => handleDurationChange(feat, e.target.value)}
                                            style={{
                                                width: '60px', background: '#000', border: '1px solid #444',
                                                color: '#fff', padding: '4px', borderRadius: '4px', textAlign: 'center'
                                            }}
                                        />
                                        <span>{t('s')}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* 2. News */}
            <section style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.5rem', margin: 0 }}>📢 {t('News & Updates')}</h3>
                    <button onClick={() => { setNewsToEdit(null); setNewsModalOpen(true); }} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ {t('Add News')}</button>
                </div>
                <div style={{ display: 'grid', gap: '16px' }}>
                    {contentData.news.map(item => (
                        <div key={item.id} style={{ background: '#111', padding: '16px', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.title}</div>
                                <div style={{ color: '#888' }}>{item.content}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => { setNewsToEdit(item); setNewsModalOpen(true); }} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Edit')}</button>
                                <button onClick={() => handleDeleteContent('gym_news', item.id)} style={{ background: '#300', color: '#f88', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Delete')}</button>
                            </div>
                        </div>
                    ))}
                    {contentData.news.length === 0 && <div style={{ color: '#666', fontStyle: 'italic' }}>{t('No news posted.')}</div>}
                </div>
            </section>

            {/* Header / View Toggle */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                <button
                    onClick={() => setViewMode('calendar')}
                    style={{
                        background: viewMode === 'calendar' ? 'var(--primary)' : '#222',
                        color: viewMode === 'calendar' ? '#000' : '#fff',
                        border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                >
                    📅 {t('Calendar View')}
                </button>
                <button
                    onClick={() => setViewMode('board')}
                    style={{
                        background: viewMode === 'board' ? 'var(--primary)' : '#222',
                        color: viewMode === 'board' ? '#000' : '#fff',
                        border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                >
                    📋 {t('Board View')}
                </button>
            </div>

            {viewMode === 'calendar' ? (
                <section style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>📆 {t('Monthly Overview')}</h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => { setEventToEdit(null); setEventModalOpen(true); }} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ {t('Add Event')}</button>
                            <button onClick={() => { setChallengeToEdit(null); setChallengeModalOpen(true); }} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ {t('Add Challenge')}</button>
                        </div>
                    </div>
                    <CalendarPlanner
                        events={contentData.events}
                        challenges={contentData.challenges}
                        onEventClick={(ev) => { setEventToEdit(ev); setEventModalOpen(true); }}
                        onChallengeClick={(ch) => { setChallengeToManage(ch); setManageModalOpen(true); }}
                    />
                </section>
            ) : (
                <>
                    {/* 3. Events */}
                    <section style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>📅 {t('Event Planner')}</h3>
                            <button onClick={() => {
                                setEventToEdit(null);
                                setEventModalOpen(true);
                            }} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ {t('Add Event')}</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
                            {(() => {
                                const groups = {
                                    'Upcoming': [],
                                    'Completed': []
                                };

                                contentData.events.forEach(item => {
                                    const now = new Date();
                                    const evDate = new Date(item.event_date);

                                    // Check if event is strictly older than 24 hours to mark it completed
                                    const isCompleted = evDate < new Date(now.getTime() - 24 * 60 * 60 * 1000);

                                    if (isCompleted) {
                                        groups['Completed'].push(item);
                                    } else {
                                        groups['Upcoming'].push(item);
                                    }
                                });

                                const renderEventCard = (item, statusColor) => (
                                    <div key={item.id} style={{ background: '#111', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${statusColor}`, borderTop: '1px solid #333', borderRight: '1px solid #333', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.title}</div>
                                            <div style={{ color: statusColor }}>{new Date(item.event_date).toLocaleDateString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                            <button onClick={() => { setEventToEdit(item); setEventModalOpen(true); }} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Edit')}</button>
                                            <button onClick={() => handleDeleteContent('gym_events', item.id)} style={{ background: '#300', color: '#f88', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Delete')}</button>
                                        </div>
                                    </div>
                                );

                                return (
                                    <>
                                        <div style={{ background: 'rgba(0, 210, 255, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(0, 210, 255, 0.2)' }}>
                                            <h3 style={{ color: '#00d2ff', borderBottom: '1px solid rgba(0, 210, 255, 0.2)', paddingBottom: '12px', marginBottom: '16px', marginTop: 0 }}>⏳ {t('Upcoming')}</h3>
                                            {groups['Upcoming'].length === 0 ? <p style={{ color: '#666', fontStyle: 'italic' }}>{t('No upcoming events.')}</p> : groups['Upcoming'].map(c => renderEventCard(c, '#00d2ff'))}
                                        </div>

                                        {groups['Completed'].length > 0 && (
                                            <div style={{ background: 'rgba(136, 136, 136, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(136, 136, 136, 0.2)' }}>
                                                <h3 style={{ color: '#888', borderBottom: '1px solid rgba(136, 136, 136, 0.2)', paddingBottom: '12px', marginBottom: '16px', marginTop: 0 }}>🏁 {t('Past')}</h3>
                                                {groups['Completed'].map(c => renderEventCard(c, '#888'))}
                                            </div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                    </section>

                    {/* 4. Challenges */}
                    <section style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>🏆 {t('Challenge Planner')}</h3>
                            <button onClick={() => {
                                setChallengeToEdit(null);
                                setChallengeModalOpen(true);
                            }} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ {t('Add Challenge')}</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'start' }}>
                            {(() => {
                                const groups = {
                                    'Active': [],
                                    'Upcoming': [],
                                    'Draft': [],
                                    'Completed': []
                                };

                                contentData.challenges.forEach(item => {
                                    let statusText = 'Unknown';
                                    const now = new Date();
                                    const start = item.start_date ? new Date(item.start_date) : null;
                                    const end = item.end_date ? new Date(item.end_date) : null;

                                    if (!item.is_published) {
                                        statusText = 'Draft';
                                    } else if (start && start > now) {
                                        statusText = 'Upcoming';
                                    } else if (end && end < now) {
                                        statusText = 'Completed';
                                    } else {
                                        statusText = 'Active';
                                    }

                                    item._status = statusText;
                                    if (groups[statusText]) groups[statusText].push(item);
                                });

                                const renderCard = (item, statusColor) => (
                                    <div key={item.id} style={{ background: '#111', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${statusColor}`, borderTop: '1px solid #333', borderRight: '1px solid #333', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.title}</div>
                                                {item._status === 'Upcoming' && <div style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '100px', background: `${statusColor}22`, color: statusColor }}>{t('Starts')} {new Date(item.start_date).toLocaleDateString()}</div>}
                                                {item._status === 'Completed' && <div style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '100px', background: `${statusColor}22`, color: statusColor }}>{t('Ended')} {new Date(item.end_date).toLocaleDateString()}</div>}
                                            </div>
                                            <div style={{ color: '#888', marginTop: '4px' }}>{item.description}</div>
                                            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                                                {(item.target_value !== null || item.target_unit) && (
                                                    <div style={{ color: '#FFC800' }}>🏆 {t('Goal:')} {item.target_value} {item.target_unit}</div>
                                                )}
                                                <div style={{ color: 'var(--success)' }}>🏅 {t('1st Place:')} {item.xp_reward_1st || 1000} XP</div>
                                                <div style={{ color: '#aaa' }}>{item.team_type === 'none' ? t('Solo Mode') : t('Team Mode') + `: ${item.team_type}`}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                            <button onClick={() => { setChallengeToManage(item); setManageModalOpen(true); }} style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{t('Manage')}</button>
                                            <button onClick={() => { setChallengeToEdit(item); setChallengeModalOpen(true); }} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Edit')}</button>
                                            <button onClick={() => handleDeleteContent('gym_challenges', item.id)} style={{ background: '#300', color: '#f88', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Delete')}</button>
                                        </div>
                                    </div>
                                );

                                return (
                                    <>
                                        {/* ACTIVE LANE */}
                                        <div style={{ background: 'rgba(255, 200, 0, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255, 200, 0, 0.2)' }}>
                                            <h3 style={{ color: 'var(--brand-yellow)', borderBottom: '1px solid rgba(255, 200, 0, 0.2)', paddingBottom: '12px', marginBottom: '16px', marginTop: 0 }}>🟢 {t('Active')}</h3>
                                            {groups['Active'].length === 0 ? <p style={{ color: '#666', fontStyle: 'italic' }}>{t('No active challenges.')}</p> : groups['Active'].map(c => renderCard(c, 'var(--brand-yellow)'))}
                                        </div>

                                        {/* UPCOMING LANE */}
                                        <div style={{ background: 'rgba(0, 210, 255, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(0, 210, 255, 0.2)' }}>
                                            <h3 style={{ color: '#00d2ff', borderBottom: '1px solid rgba(0, 210, 255, 0.2)', paddingBottom: '12px', marginBottom: '16px', marginTop: 0 }}>⏳ {t('Upcoming')}</h3>
                                            {groups['Upcoming'].length === 0 ? <p style={{ color: '#666', fontStyle: 'italic' }}>{t('No upcoming challenges.')}</p> : groups['Upcoming'].map(c => renderCard(c, '#00d2ff'))}
                                        </div>

                                        {/* DRAFT LANE */}
                                        <div style={{ background: 'rgba(136, 136, 136, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(136, 136, 136, 0.2)' }}>
                                            <h3 style={{ color: '#888', borderBottom: '1px solid rgba(136, 136, 136, 0.2)', paddingBottom: '12px', marginBottom: '16px', marginTop: 0 }}>📝 {t('Drafts')}</h3>
                                            {groups['Draft'].length === 0 ? <p style={{ color: '#666', fontStyle: 'italic' }}>{t('No drafts.')}</p> : groups['Draft'].map(c => renderCard(c, '#888'))}
                                        </div>

                                        {/* COMPLETED LANE */}
                                        <div style={{ background: 'rgba(76, 175, 80, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                                            <h3 style={{ color: 'var(--success)', borderBottom: '1px solid rgba(76, 175, 80, 0.2)', paddingBottom: '12px', marginBottom: '16px', marginTop: 0 }}>🏁 {t('Completed')}</h3>
                                            {groups['Completed'].length === 0 ? <p style={{ color: '#666', fontStyle: 'italic' }}>{t('No completed challenges.')}</p> : groups['Completed'].map(c => renderCard(c, 'var(--success)'))}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </section>
                </>
            )}
            {/* Modals */}
            <CreateEventModal
                isOpen={isEventModalOpen}
                onClose={() => { setEventModalOpen(false); setEventToEdit(null); }}
                onSave={handleSaveEvent}
                initialData={eventToEdit}
            />

            <CreateChallengeModal
                isOpen={isChallengeModalOpen}
                onClose={() => { setChallengeModalOpen(false); setChallengeToEdit(null); }}
                onSave={handleSaveChallenge}
                initialData={challengeToEdit}
            />

            <CreateNewsModal
                isOpen={isNewsModalOpen}
                onClose={() => { setNewsModalOpen(false); setNewsToEdit(null); }}
                onSave={handleSaveNews}
                initialData={newsToEdit}
            />
            <ManageChallengeModal
                isOpen={isManageModalOpen}
                onClose={() => { setManageModalOpen(false); setChallengeToManage(null); }}
                challenge={challengeToManage}
                onChallengeCompleted={fetchTvContent}
            />
        </div>
    );
}
