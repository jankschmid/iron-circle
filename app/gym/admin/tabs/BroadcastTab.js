import { useState, useEffect } from 'react';
import { pushTemplates, injectTemplateVariables } from '@/lib/pushTemplates';
import { useTranslation } from '@/context/TranslationContext';

export default function BroadcastTab({ gym, members, supabase, initialAudience = 'all' }) {
    const { t } = useTranslation();
    const [targetAudience, setTargetAudience] = useState(initialAudience); // 'all', 'at_risk', 'specific'
    const [customMessage, setCustomMessage] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    useEffect(() => {
        setTargetAudience(initialAudience);
    }, [initialAudience]);

    // Filter members based on selection
    const [targetUsers, setTargetUsers] = useState([]);

    useEffect(() => {
        if (targetAudience === 'all') {
            setTargetUsers(members);
        } else if (targetAudience === 'at_risk') {
            setTargetUsers(members.filter(m => {
                const lastWorkout = new Date(m.lastWorkout || new Date());
                const daysSince = Math.floor((new Date() - lastWorkout) / (1000 * 60 * 60 * 24));
                const gracePeriodDays = m.yearly_workout_goal ? Math.floor(365 / m.yearly_workout_goal) * 1.5 : 7;
                return daysSince > (gracePeriodDays - 2); // Identify those within 48h of losing streak
            }));
        } else {
            setTargetUsers([]); // To be implemented later with a multi-select dropdown if needed
        }
    }, [targetAudience, members]);

    const handleSendTargetedPush = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const title = formData.get('title');
        let templateId = formData.get('template');

        if (!title || (!templateId && !isCustom) || (isCustom && !customMessage)) {
            setStatusMessage({ type: 'error', text: t("Please fill all required fields.") });
            return;
        }

        let rawTemplate = "";

        if (isCustom) {
            rawTemplate = customMessage;
        } else {
            // Find the template string
            for (const cat of Object.values(pushTemplates)) {
                const found = cat.templates.find((_, i) => `${cat.title}-${i}` === templateId);
                if (found) { rawTemplate = found; break; }
            }
        }

        if (targetUsers.length === 0) {
            setStatusMessage({ type: 'error', text: t("No users selected in target audience.") });
            return;
        }

        setIsSending(true);
        setStatusMessage({ type: 'success', text: t(`Broadcasting to {count} users...`, { count: targetUsers.length }) });

        let successCount = 0;
        let failCount = 0;

        // In a real production setup, we would send this bulk array directly to a Supabase Edge Function 
        // to iterate and process. For now, since the Dispatcher expects one event, we will loop locally.
        for (const user of targetUsers) {

            // Format dynamic data for injection
            const lastWorkout = new Date(user.lastWorkout || new Date());
            const daysSince = Math.floor((new Date() - lastWorkout) / (1000 * 60 * 60 * 24));

            const gracePeriodDays = user.yearly_workout_goal ? Math.floor(365 / user.yearly_workout_goal) * 1.5 : 7;
            const hoursLeft = Math.max(0, (gracePeriodDays - daysSince) * 24);

            const userData = {
                name: user.name?.split(' ')[0] || user.username || 'Iron Circle Member',
                streak: user.current_streak || 0,
                hours_left: hoursLeft,
                event_name: 'our next gym event',
                next_streak: (user.current_streak || 0) + 1,
                gym_name: gym?.name || 'the gym',
                days_away: daysSince,
                yearly_goal: user.yearly_workout_goal || 100
            };

            const finalMessage = injectTemplateVariables(rawTemplate, userData);

            try {
                // 'admin_alert' type forces a direct notification without app-specific UI routing
                const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/push-dispatcher`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        type: 'admin_alert',
                        data: {
                            receiver_id: user.id,
                            title: title,
                            body: finalMessage,
                            gym_name: gym.name
                        }
                    })
                });

                if (res.ok) successCount++;
                else failCount++;
            } catch (err) {
                console.error("Failed to push to", user.name, err);
                failCount++;
            }
        }

        setIsSending(false);
        setStatusMessage({
            type: failCount === 0 ? 'success' : 'warning',
            text: t("Broadcast complete: {successCount} sent", { successCount }) + (failCount > 0 ? t(", {failCount} failed", { failCount }) : "")
        });

        // Reset custom message if used
        if (isCustom) setCustomMessage('');
    };

    return (
        <div style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>📣</span> {t('Gym Megaphone')}
                    </h2>
                    <div style={{ color: '#888' }}>
                        {t("Send targeted push notifications directly to your members' phones.")}
                    </div>
                </div>
            </div>

            <div style={{ background: '#111', padding: '32px', borderRadius: '16px', border: '1px solid #222' }}>
                <form onSubmit={handleSendTargetedPush}>

                    {/* Audience Selection */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', color: '#aaa', fontSize: '1rem', fontWeight: 'bold' }}>{t('Target Audience')}</label>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: targetAudience === 'all' ? '#332b00' : '#222', border: targetAudience === 'all' ? '1px solid #FFC800' : '1px solid #333', padding: '12px 20px', borderRadius: '8px' }}>
                                <input type="radio" name="audience" value="all" checked={targetAudience === 'all'} onChange={() => setTargetAudience('all')} style={{ display: 'none' }} />
                                <span style={{ color: targetAudience === 'all' ? '#FFC800' : '#fff', fontWeight: 'bold' }}>{t('All Members')}</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: targetAudience === 'at_risk' ? '#300' : '#222', border: targetAudience === 'at_risk' ? '1px solid #ff4444' : '1px solid #333', padding: '12px 20px', borderRadius: '8px' }}>
                                <input type="radio" name="audience" value="at_risk" checked={targetAudience === 'at_risk'} onChange={() => setTargetAudience('at_risk')} style={{ display: 'none' }} />
                                <span style={{ color: targetAudience === 'at_risk' ? '#ff4444' : '#fff', fontWeight: 'bold' }}>⚠️ {t('At-Risk Members')}</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed', background: '#222', border: '1px solid #333', padding: '12px 20px', borderRadius: '8px', opacity: 0.5 }}>
                                <input type="radio" name="audience" value="specific" disabled style={{ display: 'none' }} />
                                <span style={{ color: '#fff' }}>{t('Specific Users (Coming Soon)')}</span>
                            </label>
                        </div>
                        <div style={{ marginTop: '12px', color: '#888', fontSize: '0.9rem' }}>
                            {t('Currently targeting:')} <strong style={{ color: '#fff' }}>{targetUsers.length} {targetUsers.length !== 1 ? t('members') : t('member')}</strong>
                        </div>
                    </div>

                    <div style={{ borderBottom: '1px solid #333', marginBottom: '24px' }} />

                    {/* Notification Details */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('Notification Title')}</label>
                        <input
                            name="title"
                            defaultValue={gym?.name || t("Gym Update")}
                            style={{ width: '100%', padding: '16px', background: '#222', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '1.1rem' }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ color: '#aaa', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('Message Content')}</label>
                            <button type="button" onClick={() => setIsCustom(!isCustom)} style={{ background: 'none', border: 'none', color: '#0066ff', cursor: 'pointer', fontSize: '0.9rem' }}>
                                {isCustom ? t("Use Template") : t("Write Custom Message")}
                            </button>
                        </div>

                        {!isCustom ? (
                            <select
                                name="template"
                                defaultValue=""
                                style={{ width: '100%', padding: '16px', background: '#222', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '1rem' }}
                                required={!isCustom}
                            >
                                <option value="" disabled>{t('-- Select a predefined template --')}</option>
                                {Object.entries(pushTemplates).map(([key, category]) => (
                                    <optgroup key={key} label={t(category.title)}>
                                        {category.templates.map((tmpl, idx) => (
                                            <option key={`${key}-${idx}`} value={`${category.title}-${idx}`}>
                                                {tmpl.length > 80 ? tmpl.substring(0, 77) + '...' : tmpl}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        ) : (
                            <div>
                                <textarea
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    placeholder={t("Hi {name}, you have a solid {streak} day streak going! Don't let it slip...")}
                                    style={{ width: '100%', minHeight: '120px', padding: '16px', background: '#222', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '1rem', resize: 'vertical' }}
                                    required={isCustom}
                                />
                                <div style={{ marginTop: '12px', background: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #333' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('Insert Variables (Click to add):')}</label>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                        {['{name}', '{streak}', '{hours_left}', '{next_streak}', '{gym_name}', '{days_away}', '{yearly_goal}'].map(variable => (
                                            <button
                                                key={variable}
                                                type="button"
                                                onClick={() => setCustomMessage(prev => prev + variable)}
                                                style={{ background: '#332b00', color: '#FFC800', border: '1px solid #FFC800', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                                            >
                                                {variable}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                        <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <li><strong style={{ color: '#ccc' }}>{`{name}`}</strong>: {t("The member's first name.")}</li>
                                            <li><strong style={{ color: '#ccc' }}>{`{streak}`}</strong>: {t("The member's current workout streak.")}</li>
                                            <li><strong style={{ color: '#ccc' }}>{`{hours_left}`}</strong>: {t("Hours remaining in their grace period before the streak resets.")}</li>
                                            <li><strong style={{ color: '#ccc' }}>{`{next_streak}`}</strong>: {t("The streak number they will hit upon next check-in.")}</li>
                                            <li><strong style={{ color: '#ccc' }}>{`{gym_name}`}</strong>: {t("The name of this gym.")}</li>
                                            <li><strong style={{ color: '#ccc' }}>{`{days_away}`}</strong>: {t("Days since their last workout.")}</li>
                                            <li><strong style={{ color: '#ccc' }}>{`{yearly_goal}`}</strong>: {t("Their total workout goal for the year.")}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                        {!isCustom && (
                            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '12px', background: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
                                <strong>💡 {t('Pro Tip:')}</strong> {t("Variables like {name} and {streak} will be automatically replaced with each user's real data before sending.", { name: '<code style="color: #FFC800">{name}</code>', streak: '<code style="color: #FFC800">{streak}</code>' })}
                            </div>
                        )}
                    </div>

                    {statusMessage && (
                        <div style={{
                            padding: '16px', borderRadius: '8px', marginBottom: '24px',
                            background: statusMessage.type === 'error' ? '#4a0000' : statusMessage.type === 'success' ? '#003300' : '#4a3300',
                            color: statusMessage.type === 'error' ? '#ff8888' : statusMessage.type === 'success' ? '#88ff88' : '#ffc800',
                            border: `1px solid ${statusMessage.type === 'error' ? '#ff4444' : statusMessage.type === 'success' ? '#00ff00' : '#ffaa00'}`
                        }}>
                            {statusMessage.text}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                        <button
                            type="submit"
                            disabled={isSending || targetUsers.length === 0}
                            style={{ flex: 1, padding: '16px', background: (isSending || targetUsers.length === 0) ? '#444' : '#FFC800', color: (isSending || targetUsers.length === 0) ? '#888' : '#000', border: 'none', borderRadius: '8px', cursor: (isSending || targetUsers.length === 0) ? 'not-allowed' : 'pointer', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                        >
                            {isSending ? t("Broadcasting...") : t("Broadcast Now 🚀")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
