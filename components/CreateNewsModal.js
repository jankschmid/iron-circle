import { useState, useEffect } from 'react';
import { useTranslation } from '@/context/TranslationContext';
import { useToast } from '@/components/ToastProvider';

export default function CreateNewsModal({ isOpen, onClose, onSave, initialData = null }) {
    const { t } = useTranslation();
    const toast = useToast();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || '');
                setContent(initialData.content || '');
            } else {
                setTitle('');
                setContent('');
            }
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            return toast.error(t('Title and Content are required.'));
        }

        setLoading(true);
        try {
            await onSave({
                title: title.trim(),
                content: content.trim()
            });
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err.message || t('Error saving news.'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--surface)', width: '100%', maxWidth: '600px',
                borderRadius: '16px', padding: '32px', border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '90vh', overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{initialData ? t('Edit News') : t('Create News Update')}</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('News Title')} *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('e.g. New Equipment Arriving!')}
                            style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('Content')} *</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={t('We are happy to announce...')}
                            rows={6}
                            style={{ width: '100%', padding: '12px', background: 'var(--background)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px', resize: 'vertical' }}
                        />
                        <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>
                            {t('Available variables:')} <span style={{ color: '#FFC800' }}>{'{name}, {streak}, {gym_name}, {hours_left}'}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {t('Cancel')}
                    </button>
                    <button onClick={handleSave} disabled={loading} style={{ flex: 1, padding: '14px', background: 'var(--primary)', border: 'none', color: '#000', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {loading ? t('Saving...') : t('Save News')}
                    </button>
                </div>
            </div>
        </div>
    );
}
