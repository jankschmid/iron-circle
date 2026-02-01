"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase';


import { useToast } from '@/components/ToastProvider';

export default function GymAdminModal({ gymId, onClose }) {
    const supabase = createClient();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('news'); // 'news' | 'events'
    const [loading, setLoading] = useState(false);

    // News Form
    const [newsTitle, setNewsTitle] = useState('');
    const [newsContent, setNewsContent] = useState('');

    // Event Form
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventDesc, setEventDesc] = useState('');

    const handleCreateNews = async () => {
        if (!newsTitle.trim() || !newsContent.trim()) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('gym_news')
                .insert({
                    gym_id: gymId,
                    title: newsTitle,
                    content: newsContent,
                    is_active: true
                });

            if (error) throw error;
            toast.success("News Posted!");
            setNewsTitle('');
            setNewsContent('');
            onClose(); // Close to refresh (GymHub should ideally re-fetch or we pass callback)
        } catch (err) {
            console.error(err);
            toast.error("Error creating news");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async () => {
        if (!eventTitle.trim() || !eventDate) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('gym_events')
                .insert({
                    gym_id: gymId,
                    title: eventTitle,
                    description: eventDesc,
                    event_date: new Date(eventDate).toISOString()
                });

            if (error) throw error;
            toast.success("Event Created!");
            setEventTitle('');
            setEventDesc('');
            setEventDate('');
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Error creating event");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--surface)',
                width: '100%', maxWidth: '500px',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                maxHeight: '90vh'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Gym Admin</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setActiveTab('news')}
                        style={{
                            flex: 1, padding: '16px', background: activeTab === 'news' ? 'var(--surface-highlight)' : 'transparent',
                            color: activeTab === 'news' ? 'var(--primary)' : 'var(--text-muted)',
                            border: 'none', fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        Announcements
                    </button>
                    <button
                        onClick={() => setActiveTab('events')}
                        style={{
                            flex: 1, padding: '16px', background: activeTab === 'events' ? 'var(--surface-highlight)' : 'transparent',
                            color: activeTab === 'events' ? 'var(--primary)' : 'var(--text-muted)',
                            border: 'none', fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        Events
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px', overflowY: 'auto' }}>
                    {activeTab === 'news' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Title</label>
                                <input
                                    value={newsTitle} onChange={e => setNewsTitle(e.target.value)}
                                    placeholder="e.g. Holiday Hours"
                                    style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Message</label>
                                <textarea
                                    value={newsContent} onChange={e => setNewsContent(e.target.value)}
                                    placeholder="What's happening?"
                                    rows={5}
                                    style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', resize: 'vertical' }}
                                />
                            </div>
                            <button
                                onClick={handleCreateNews}
                                disabled={loading || !newsTitle.trim()}
                                style={{
                                    padding: '12px', background: 'var(--primary)', color: '#000',
                                    border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                                    marginTop: '8px'
                                }}
                            >
                                {loading ? 'Posting...' : 'Post Announcement'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Event Title</label>
                                <input
                                    value={eventTitle} onChange={e => setEventTitle(e.target.value)}
                                    placeholder="e.g. Powerlifting Meet"
                                    style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={eventDate} onChange={e => setEventDate(e.target.value)}
                                    style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Description</label>
                                <textarea
                                    value={eventDesc} onChange={e => setEventDesc(e.target.value)}
                                    placeholder="Event details..."
                                    rows={4}
                                    style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', resize: 'vertical' }}
                                />
                            </div>
                            <button
                                onClick={handleCreateEvent}
                                disabled={loading || !eventTitle.trim() || !eventDate}
                                style={{
                                    padding: '12px', background: 'var(--primary)', color: '#000',
                                    border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                                    marginTop: '8px'
                                }}
                            >
                                {loading ? 'Creating...' : 'Create Event'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
