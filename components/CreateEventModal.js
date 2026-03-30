import { useState, useEffect } from 'react';
import { useTranslation } from '@/context/TranslationContext';
import { useToast } from '@/components/ToastProvider';

export default function CreateEventModal({ isOpen, onClose, onSave, initialData = null }) {
    const { t } = useTranslation();
    const toast = useToast();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || '');
                setDescription(initialData.description || '');
                setLocation(initialData.location || '');

                // Format dates for datetime-local input
                const formatForInput = (isoString) => {
                    if (!isoString) return '';
                    const d = new Date(isoString);
                    // Adjust to local time format YYYY-MM-DDThh:mm
                    const tzOffset = d.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(d - tzOffset)).toISOString().slice(0, 16);
                    return localISOTime;
                };

                setStartDate(formatForInput(initialData.event_date));
                setEndDate(formatForInput(initialData.end_date));
            } else {
                setTitle('');
                setDescription('');
                setLocation('');
                setStartDate('');
                setEndDate('');
            }
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!title.trim()) {
            return toast.error(t('Title is required.'));
        }
        if (!startDate) {
            return toast.error(t('Start Date/Time is required.'));
        }

        setLoading(true);
        try {
            await onSave({
                title: title.trim(),
                description: description.trim() || null,
                location: location.trim() || null,
                event_date: new Date(startDate).toISOString(),
                end_date: endDate ? new Date(endDate).toISOString() : null
            });
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err.message || t('Error saving event.'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'calc(var(--safe-top, 24px) + 20px) 20px calc(var(--safe-bottom, 24px) + 20px)'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--surface)', width: '100%', maxWidth: '600px',
                borderRadius: '16px', padding: '32px', border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '90vh', overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{initialData ? t('Edit Event') : t('Create New Event')}</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Title & Description */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('Event Title')} *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('e.g. Summer Bootcamp Challenge')}
                            style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('Description')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('Add some details about the event...')}
                            rows={3}
                            style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />

                    {/* Location & Time */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('Location')}</label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder={t('e.g. Studio 1, Outdoor Park')}
                            style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('Start')} *</label>
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('End')} ({t('Optional')})</label>
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                            />
                        </div>
                    </div>

                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {t('Cancel')}
                    </button>
                    <button onClick={handleSave} disabled={loading} style={{ flex: 1, padding: '14px', background: 'var(--primary)', border: 'none', color: '#000', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {loading ? t('Saving...') : t('Save Event')}
                    </button>
                </div>
            </div>
        </div>
    );
}
