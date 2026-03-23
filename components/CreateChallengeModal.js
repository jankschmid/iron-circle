import { useState, useEffect } from 'react';
import { useTranslation } from '@/context/TranslationContext';
import { useToast } from '@/components/ToastProvider';

export default function CreateChallengeModal({ isOpen, onClose, onSave, initialData = null }) {
    const { t } = useTranslation();
    const toast = useToast();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [teamType, setTeamType] = useState('none');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [targetUnit, setTargetUnit] = useState('reps');
    const [customUnit, setCustomUnit] = useState('');
    const [xp1st, setXp1st] = useState(1000);
    const [xp2nd, setXp2nd] = useState(500);
    const [xpParticipation, setXpParticipation] = useState(200);
    const [adminDefinedTeams, setAdminDefinedTeams] = useState([{ name: 'Red Team' }, { name: 'Blue Team' }]);
    const [loading, setLoading] = useState(false);

    const PRESET_UNITS = ['none', 'reps', 'kg', 'lbs', 'hours', 'minutes', 'km', 'miles', 'calories', 'custom'];

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || '');
                setDescription(initialData.description || '');
                setTeamType(initialData.team_type || 'none');

                const formatForInput = (dateObjOrStr) => {
                    if (!dateObjOrStr) return '';
                    const d = new Date(dateObjOrStr);
                    const tzOffset = d.getTimezoneOffset() * 60000;
                    return (new Date(d - tzOffset)).toISOString().slice(0, 16);
                };

                setStartDate(formatForInput(initialData.start_date));
                setEndDate(formatForInput(initialData.end_date));

                setTargetValue(initialData.target_value ? String(initialData.target_value) : '');

                const savedUnit = initialData.goal_type || initialData.target_unit;
                if (savedUnit) {
                    if (PRESET_UNITS.includes(savedUnit)) {
                        setTargetUnit(savedUnit);
                    } else {
                        setTargetUnit('custom');
                        setCustomUnit(savedUnit);
                    }
                } else {
                    setTargetUnit('none');
                }

                setXp1st(initialData.xp_reward_1st || 1000);
                setXp2nd(initialData.xp_reward_2nd || 500);
                setXpParticipation(initialData.xp_reward_participation || 200);
                // Currently, we don't pass teams in initialData from the parent, but if we do in the future:
                if (initialData.teams && initialData.teams.length > 0) {
                    setAdminDefinedTeams(initialData.teams.map(t => ({ name: t.team_name || t.name })));
                } else {
                    setAdminDefinedTeams([{ name: 'Red Team' }, { name: 'Blue Team' }]);
                }
            } else {
                const formatForInput = (dateObjOrStr) => {
                    if (!dateObjOrStr) return '';
                    const d = new Date(dateObjOrStr);
                    const tzOffset = d.getTimezoneOffset() * 60000;
                    return (new Date(d - tzOffset)).toISOString().slice(0, 16);
                };

                setTitle('');
                setDescription('');
                setTeamType('none');
                setStartDate(formatForInput(new Date()));
                setEndDate('');
                setTargetValue('');
                setTargetUnit('reps');
                setCustomUnit('');
                setXp1st(1000);
                setXp2nd(500);
                setXpParticipation(200);
                setAdminDefinedTeams([{ name: 'Red Team' }, { name: 'Blue Team' }]);
            }
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!title.trim()) return toast.error(t('Title is required.'));
        if (!startDate) return toast.error(t('Start Date/Time is required.'));

        const finalUnit = targetUnit === 'custom' ? customUnit.trim() : (targetUnit === 'none' ? null : targetUnit);

        let teamsToSave = [];
        if (teamType === 'admin_defined') {
            teamsToSave = adminDefinedTeams.map(t => t.name.trim()).filter(Boolean);
            if (teamsToSave.length < 2) {
                return toast.error(t('Admin Defined mode requires at least 2 teams.'));
            }
        }

        setLoading(true);
        try {
            await onSave({
                title: title.trim(),
                description: description.trim() || null,
                team_type: teamType,
                start_date: new Date(startDate).toISOString(),
                end_date: endDate ? new Date(endDate).toISOString() : null,
                target_value: targetValue ? parseFloat(targetValue) : null,
                goal_type: finalUnit,
                xp_reward_1st: parseInt(xp1st) || 1000,
                xp_reward_2nd: parseInt(xp2nd) || 500,
                xp_reward_3rd: parseInt(xp2nd) || 500, // Sync 3rd with 2nd
                xp_reward_participation: parseInt(xpParticipation) || 200,
                is_published: true, // auto publish by default
                admin_teams: teamsToSave // Pass this to the parent to handle insertions
            });
            onClose();
        } catch (err) {
            console.error("Save Challenge Error:", err);
            toast.error(err?.message || (typeof err === 'object' ? JSON.stringify(err) : t('Error saving challenge.')));
        } finally {
            setLoading(false);
        }
    };

    const teamModeOptions = [
        { id: 'none', label: t('Solo Mode'), desc: t('Users compete individually. No teams.'), icon: '👤' },
        { id: 'squad_based', label: t('Squad Based'), desc: t('Auto-compete using their existing Squads.'), icon: '🛡️' },
        { id: 'admin_defined', label: t('Admin Defined'), desc: t('Pre-defined factions (e.g. Red vs Blue).'), icon: '⚔️' },
        { id: 'open_creation', label: t('Open Creation'), desc: t('Users can dynamically create active teams.'), icon: '👥' }
    ];

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--surface)', width: '100%', maxWidth: '700px',
                borderRadius: '16px', padding: '32px', border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '90vh', overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{initialData ? t('Edit Challenge') : t('Create New Challenge')}</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* SECTION 1: BASICS */}
                    <div>
                        <h4 style={{ color: 'var(--primary)', margin: '0 0 12px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>1. {t('Basics')}</h4>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{t('Challenge Title')} *</label>
                            <input
                                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('e.g. 10,000 Pushups Month')}
                                style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{t('Description')}</label>
                            <textarea
                                value={description} onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('Explain the rules...')} rows={3}
                                style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px', resize: 'vertical' }}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>
                                {t('Available variables:')} <span style={{ color: '#FFC800' }}>{'{name}, {streak}, {gym_name}, {hours_left}'}</span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: TEAM MODE */}
                    <div>
                        <h4 style={{ color: 'var(--primary)', margin: '0 0 12px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>2. {t('Team Mode')}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            {teamModeOptions.map(opt => (
                                <div key={opt.id} onClick={() => setTeamType(opt.id)} style={{
                                    border: teamType === opt.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                    background: teamType === opt.id ? 'rgba(255, 200, 0, 0.1)' : 'var(--background)',
                                    padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
                                }}>
                                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{opt.icon}</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px', color: teamType === opt.id ? 'var(--primary)' : '#fff' }}>{opt.label}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>{opt.desc}</div>
                                </div>
                            ))}
                        </div>

                        {teamType === 'admin_defined' && (
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>{t('Define Faction Names')}</label>
                                {adminDefinedTeams.map((team, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <input
                                            type="text"
                                            value={team.name}
                                            onChange={(e) => {
                                                const newTeams = [...adminDefinedTeams];
                                                newTeams[idx].name = e.target.value;
                                                setAdminDefinedTeams(newTeams);
                                            }}
                                            placeholder={t(`Team ${idx + 1} Name`)}
                                            style={{ flex: 1, padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                                        />
                                        {adminDefinedTeams.length > 2 && (
                                            <button
                                                onClick={() => setAdminDefinedTeams(adminDefinedTeams.filter((_, i) => i !== idx))}
                                                style={{ padding: '0 16px', background: '#422', color: '#f88', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={() => setAdminDefinedTeams([...adminDefinedTeams, { name: '' }])}
                                    style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer', marginTop: '8px' }}
                                >
                                    + {t('Add Faction')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: TIMELINE & GOALS */}
                    <div>
                        <h4 style={{ color: 'var(--primary)', margin: '0 0 12px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>3. {t('Timeline & Goal')}</h4>

                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{t('Start')} *</label>
                                <input
                                    type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                    style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{t('End')} ({t('Optional')})</label>
                                <input
                                    type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                                    style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{t('Target Amount')} ({t('Optional')})</label>
                                <input
                                    type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)}
                                    placeholder="e.g. 1000"
                                    style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{t('Unit')}</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        value={targetUnit} onChange={(e) => setTargetUnit(e.target.value)}
                                        style={{ flex: 1, padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    >
                                        <option value="none">{t('None')}</option>
                                        <option value="reps">Reps</option>
                                        <option value="kg">kg</option>
                                        <option value="lbs">lbs</option>
                                        <option value="hours">Hours</option>
                                        <option value="minutes">Minutes</option>
                                        <option value="km">Km</option>
                                        <option value="miles">Miles</option>
                                        <option value="calories">Calories</option>
                                        <option value="custom">{t('Custom...')}</option>
                                    </select>
                                    {targetUnit === 'custom' && (
                                        <input
                                            type="text" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)}
                                            placeholder={t('Unit')}
                                            style={{ flex: 1, padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: GAMIFICATION */}
                    <div>
                        <h4 style={{ color: 'var(--primary)', margin: '0 0 12px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>4. {t('Gamification (XP Rewards)')}</h4>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--success)' }}>🥇 {t('1st Place')}</label>
                                <input type="number" value={xp1st} onChange={(e) => setXp1st(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#C0C0C0' }}>🥈 {t('2nd/3rd Place')}</label>
                                <input type="number" value={xp2nd} onChange={(e) => setXp2nd(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#CD7F32' }}>🏅 {t('Participation')}</label>
                                <input type="number" value={xpParticipation} onChange={(e) => setXpParticipation(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {t('Cancel')}
                    </button>
                    <button onClick={handleSave} disabled={loading} style={{ flex: 1, padding: '14px', background: 'var(--primary)', border: 'none', color: '#000', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {loading ? t('Saving...') : t('Save Challenge')}
                    </button>
                </div>
            </div>
        </div>
    );
}
