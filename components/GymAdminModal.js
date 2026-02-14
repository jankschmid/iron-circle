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

    // Submissions State
    const [submissions, setSubmissions] = useState([]);

    const fetchSubmissions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('challenge_submissions')
            .select('*, gym_challenges(title), profiles:user_id(name, username)')
            .eq('status', 'pending')
            // Filter by challenges in this gym (indirectly via join or filtering after?)
            // RLS handles visibility, so just need to filter by gym in query:
            // But we can't join deeply in select easily on one go without view?
            // Actually RLS policy "Staff can view submissions" handles checking gym_id.
            // So we can select ALL pending submissions visible to us.
            // But if user is admin of multiple gyms, might get mixed.
            // Add filtering:
            // .eq('gym_challenges.gym_id', gymId) -> Not possible on Supabase without inner join filter
            // Let's rely on RLS and then filter or just fetch challenges first.
            // Better: Get challenges for this gym, then submissions for those challenges.
            .order('created_at', { ascending: false });

        if (data) {
            // Filter locally for this gym just in case
            // Need to fetch gym_challenges with gym_id?
            // "gym_challenges(title, gym_id)"
            // Yes.

            // Re-fetch logic to be safe
            const { data: gymChallenges } = await supabase.from('gym_challenges').select('id').eq('gym_id', gymId);
            const challengeIds = gymChallenges?.map(c => c.id) || [];

            const { data: subs } = await supabase
                .from('challenge_submissions')
                .select('*, gym_challenges(title, target_value, target_unit), profiles:user_id(name, username, avatar_url)')
                .in('challenge_id', challengeIds)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            setSubmissions(subs || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'submissions') {
            fetchSubmissions();
        }
    }, [activeTab]);

    const handleVerify = async (id, status) => {
        if (!confirm(`Mark this submission as ${status}?`)) return;

        try {
            const { data, error } = await supabase.rpc('verify_submission', {
                p_submission_id: id,
                p_status: status
            });

            if (data?.success) {
                toast.success(`Submission ${status}`);
                setSubmissions(prev => prev.filter(s => s.id !== id));
            } else {
                alert("Failed: " + (data?.message || error?.message));
            }
        } catch (err) {
            console.error(err);
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
                width: '100%', maxWidth: '600px',
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
                    <button
                        onClick={() => setActiveTab('submissions')}
                        style={{
                            flex: 1, padding: '16px', background: activeTab === 'submissions' ? 'var(--surface-highlight)' : 'transparent',
                            color: activeTab === 'submissions' ? 'var(--primary)' : 'var(--text-muted)',
                            border: 'none', fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        Submissions {submissions.length > 0 && `(${submissions.length})`}
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px', overflowY: 'auto' }}>
                    {activeTab === 'news' && (
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
                    )}

                    {activeTab === 'events' && (
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

                    {activeTab === 'submissions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {submissions.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                    No pending submissions.
                                </div>
                            ) : (
                                submissions.map(sub => (
                                    <div key={sub.id} style={{
                                        background: 'var(--background)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#333', overflow: 'hidden' }}>
                                                <img src={sub.profiles?.avatar_url} style={{ width: '100%', height: '100%' }} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{sub.profiles?.username || 'Unknown User'}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sub.gym_challenges?.title}</div>
                                            </div>
                                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                                <div style={{ fontWeight: '900', color: 'var(--primary)', fontSize: '1.2rem' }}>
                                                    {sub.value} {sub.gym_challenges?.target_unit || ''}
                                                </div>
                                                {sub.proof_url && (
                                                    <a href={sub.proof_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#00d2ff' }}>
                                                        View Proof ↗
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        {sub.note && (
                                            <div style={{ fontSize: '0.9rem', color: '#aaa', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px', marginBottom: '12px' }}>
                                                "{sub.note}"
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => handleVerify(sub.id, 'rejected')}
                                                style={{ flex: 1, padding: '8px', background: '#4a0000', color: '#ffaaaa', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleVerify(sub.id, 'verified')}
                                                style={{ flex: 1, padding: '8px', background: '#004400', color: '#aaffaa', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                Verify
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
