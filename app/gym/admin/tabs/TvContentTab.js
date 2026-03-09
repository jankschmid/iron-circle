import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { useState } from 'react';
import { useTranslation } from '@/context/TranslationContext';

export default function TvContentTab({
    gymId,
    tvSettings, toggleTvFeature, handleDurationChange,
    contentData, handleAddNews, handleEditNews, handleDeleteContent,
    handleEditEvent, handleEditChallenge,
    setInputModal, fetchTvContent, supabase
}) {
    const toast = useToast();
    const { t } = useTranslation();

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
                    <button onClick={handleAddNews} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ {t('Add News')}</button>
                </div>
                <div style={{ display: 'grid', gap: '16px' }}>
                    {contentData.news.map(item => (
                        <div key={item.id} style={{ background: '#111', padding: '16px', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.title}</div>
                                <div style={{ color: '#888' }}>{item.content}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleEditNews(item)} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Edit')}</button>
                                <button onClick={() => handleDeleteContent('gym_news', item.id)} style={{ background: '#300', color: '#f88', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Delete')}</button>
                            </div>
                        </div>
                    ))}
                    {contentData.news.length === 0 && <div style={{ color: '#666', fontStyle: 'italic' }}>{t('No news posted.')}</div>}
                </div>
            </section>

            {/* 3. Events */}
            <section style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.5rem', margin: 0 }}>📅 {t('Upcoming Events')}</h3>
                    <button onClick={() => {
                        setInputModal({
                            isOpen: true,
                            title: t("Add Event"),
                            fields: [
                                { name: 'title', label: t('Title'), type: 'text' },
                                { name: 'date', label: t('Date'), type: 'date' }
                            ],
                            confirmText: t("Add Event"),
                            onConfirm: async (values) => {
                                setInputModal({ isOpen: false });
                                if (!values.title || !values.date) return toast.error(t("Title and Date required"));
                                const { error } = await supabase.from('gym_events').insert({
                                    gym_id: gymId,
                                    title: values.title,
                                    event_date: new Date(values.date).toISOString()
                                });
                                if (!error) {
                                    toast.success(t("Event added"));
                                    fetchTvContent();
                                } else {
                                    toast.error(t("Error adding event"));
                                }
                            },
                            onCancel: () => setInputModal({ isOpen: false })
                        })
                    }} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ {t('Add Event')}</button>
                </div>
                <div style={{ display: 'grid', gap: '16px' }}>
                    {contentData.events.map(item => (
                        <div key={item.id} style={{ background: '#111', padding: '16px', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.title}</div>
                                <div style={{ color: '#FFC800' }}>{new Date(item.event_date).toLocaleDateString()}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleEditEvent(item)} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Edit')}</button>
                                <button onClick={() => handleDeleteContent('gym_events', item.id)} style={{ background: '#300', color: '#f88', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Delete')}</button>
                            </div>
                        </div>
                    ))}
                    {contentData.events.length === 0 && <div style={{ color: '#666', fontStyle: 'italic' }}>{t('No upcoming events.')}</div>}
                </div>
            </section>

            {/* 4. Challenges */}
            <section style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.5rem', margin: 0 }}>🏆 {t('Active Challenges')}</h3>
                    <button onClick={() => {
                        setInputModal({
                            isOpen: true,
                            title: t("Add Challenge"),
                            fields: [
                                { name: 'title', label: t('Title'), type: 'text' },
                                { name: 'description', label: t('Description'), type: 'textarea' },
                                {
                                    name: 'helper', type: 'custom', render: (values, handleChange) => (
                                        <div style={{ marginTop: '-8px', marginBottom: '16px', fontSize: '0.8rem', color: '#888' }}>
                                            <span style={{ color: '#aaa' }}>{t('You can use the following variables:')}</span> <br />
                                            {['{name}', '{streak}', '{gym_name}', '{hours_left}', '{next_streak}'].map(v => (
                                                <span key={v}
                                                    onClick={() => handleChange('description', (values['description'] || '') + ' ' + v)}
                                                    style={{ cursor: 'pointer', background: '#333', padding: '2px 6px', borderRadius: '4px', margin: '4px 4px 0 0', display: 'inline-block', color: '#FFC800' }}>
                                                    {v}
                                                </span>
                                            ))}
                                        </div>
                                    )
                                },
                                {
                                    name: 'team_type', label: t('Team Mode'), type: 'select',
                                    options: [
                                        { value: 'none', label: t('Solo (No Teams)') },
                                        { value: 'admin_defined', label: t('Admin Defined (e.g. Red vs Blue)') },
                                        { value: 'squad_based', label: t('Squad Based (Auto-join via Squad)') },
                                        { value: 'open_creation', label: t('Open Creation (Users make ad-hoc teams)') }
                                    ],
                                    defaultValue: 'none'
                                },
                                { name: 'start_date', label: t('Start Date & Time (Optional for immediate)'), type: 'datetime-local' },
                                { name: 'end_date', label: t('End Date & Time'), type: 'datetime-local' },
                                { name: 'target_value', label: t('Target Value (Goal)'), type: 'number' },
                                { name: 'target_unit', label: t('Unit (e.g. kg, reps, hours)'), type: 'text' },
                                { name: 'xp_reward_1st', label: t('XP Reward (1st Place)'), type: 'number', defaultValue: 1000 },
                                { name: 'xp_reward_2nd', label: t('XP Reward (2nd/3rd Place)'), type: 'number', defaultValue: 500 },
                                { name: 'xp_reward_participation', label: t('XP Reward (Participation)'), type: 'number', defaultValue: 200 }
                            ],
                            confirmText: t("Add Challenge"),
                            onConfirm: async (values) => {
                                setInputModal({ isOpen: false });
                                if (!values.title) return toast.error(t("Title required"));
                                await supabase.from('gym_challenges').insert({
                                    gym_id: gymId,
                                    title: values.title,
                                    description: values.description,
                                    team_type: values.team_type || 'none',
                                    start_date: values.start_date ? new Date(values.start_date).toISOString() : null,
                                    end_date: values.end_date ? new Date(values.end_date).toISOString() : null,
                                    target_value: values.target_value ? parseFloat(values.target_value) : null,
                                    target_unit: values.target_unit || null,
                                    xp_reward_1st: values.xp_reward_1st ? parseInt(values.xp_reward_1st) : 1000,
                                    xp_reward_2nd: values.xp_reward_2nd ? parseInt(values.xp_reward_2nd) : 500,
                                    xp_reward_3rd: values.xp_reward_2nd ? parseInt(values.xp_reward_2nd) : 500, // same as 2nd for now
                                    xp_reward_participation: values.xp_reward_participation ? parseInt(values.xp_reward_participation) : 200,
                                    is_published: true // auto publish for now
                                });
                                toast.success(t("Challenge added"));
                                fetchTvContent();
                            },
                            onCancel: () => setInputModal({ isOpen: false })
                        })
                    }} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>+ {t('Add Challenge')}</button>
                </div>
                <div style={{ display: 'grid', gap: '16px' }}>
                    {contentData.challenges.map(item => {
                        let statusText = 'Unknown';
                        let statusColor = '#888';
                        const now = new Date();
                        const start = item.start_date ? new Date(item.start_date) : null;
                        const end = item.end_date ? new Date(item.end_date) : null;

                        if (!item.is_published) {
                            statusText = 'Draft';
                            statusColor = '#888';
                        } else if (start && start > now) {
                            statusText = `Upcoming (${start.toLocaleDateString()})`;
                            statusColor = '#00d2ff';
                        } else if (end && end < now) {
                            statusText = 'Completed';
                            statusColor = 'var(--success)';
                        } else {
                            statusText = 'Active';
                            statusColor = 'var(--brand-yellow)';
                        }

                        return (
                            <div key={item.id} style={{ background: '#111', padding: '16px', borderRadius: '12px', border: `1px solid ${statusColor}`, display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.title}</div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '100px', background: `${statusColor}22`, color: statusColor, textTransform: 'uppercase' }}>
                                            {statusText}
                                        </div>
                                    </div>
                                    <div style={{ color: '#888', marginTop: '4px' }}>{item.description}</div>
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.9rem' }}>
                                        {(item.target_value !== null || item.target_unit) && (
                                            <div style={{ color: '#FFC800' }}>
                                                🏆 {t('Goal:')} {item.target_value} {item.target_unit}
                                            </div>
                                        )}
                                        <div style={{ color: 'var(--success)' }}>
                                            🏅 {t('1st Place:')} {item.xp_reward_1st || 1000} XP
                                        </div>
                                        <div style={{ color: '#aaa' }}>
                                            {item.team_type === 'none' ? t('Solo Mode') : t('Team Mode') + `: ${item.team_type}`}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <button onClick={() => handleEditChallenge(item)} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Edit')}</button>
                                    <button onClick={() => handleDeleteContent('gym_challenges', item.id)} style={{ background: '#300', color: '#f88', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>{t('Delete')}</button>
                                </div>
                            </div>
                        );
                    })}
                    {contentData.challenges.length === 0 && <div style={{ color: '#666', fontStyle: 'italic' }}>{t('No active challenges.')}</div>}
                </div>
            </section>
        </div>
    );
}
