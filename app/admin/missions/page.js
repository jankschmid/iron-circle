"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function MissionControlPage() {
    const { user } = useStore();
    const [supabase] = useState(() => createClient());
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('SOLO'); // 'SOLO' | 'GROUP'
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchTemplates();
    }, [user, activeTab]);

    const fetchTemplates = async () => {
        setLoading(true);
        let query;

        if (activeTab === 'SOLO') {
            query = supabase.from('operations_templates')
                .select('*')
                .order('created_at', { ascending: false });
        } else {
            query = supabase.from('community_goal_templates')
                .select('*')
                .order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        if (error) {
            console.error("Fetch Error:", error);
            alert("Error fetching templates: " + error.message);
        } else {
            setTemplates(data || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id, title) => {
        if (!confirm(`⚠️ DELETE "${title}"?\nThis will remove the template for future missions. Existing active missions will be unaffected.\nContinue?`)) return;

        const table = activeTab === 'SOLO' ? 'operations_templates' : 'community_goal_templates';
        const { error } = await supabase.from(table).delete().eq('id', id);

        if (error) {
            alert("Delete Failed: " + error.message);
        } else {
            setTemplates(prev => prev.filter(t => t.id !== id));
            alert("Template Deleted.");
        }
    };

    if (!user) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Mission Control...</div>;

    return (
        <div style={{ minHeight: '100vh', background: '#111', color: '#fff', fontFamily: 'Inter', padding: '40px 20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => router.push('/admin/master')}
                            style={{ background: 'none', border: '1px solid #444', color: '#888', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}
                        >
                            ←
                        </button>
                        <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>MISSION <span style={{ color: '#FFC800' }}>CONTROL</span></h1>
                    </div>
                    <button
                        onClick={() => router.push('/admin/missions/create')}
                        style={{
                            background: '#FFC800',
                            color: '#000',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        + Create New Mission
                    </button>
                </header>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '2px', marginBottom: '24px', background: '#222', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
                    <button
                        onClick={() => setActiveTab('SOLO')}
                        style={{
                            padding: '8px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === 'SOLO' ? '#333' : 'transparent',
                            color: activeTab === 'SOLO' ? '#fff' : '#666',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Solo Operations
                    </button>
                    <button
                        onClick={() => setActiveTab('GROUP')}
                        style={{
                            padding: '8px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === 'GROUP' ? '#333' : 'transparent',
                            color: activeTab === 'GROUP' ? '#fff' : '#666',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Community Goals
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Scanning database...</div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="desktop-view" style={{ background: '#222', borderRadius: '16px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ background: '#333', textAlign: 'left', fontSize: '0.9rem', color: '#888', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '16px' }}>Title</th>
                                        <th style={{ padding: '16px' }}>Criteria</th>
                                        <th style={{ padding: '16px' }}>Reward</th>
                                        <th style={{ padding: '16px' }}>Focus/Tag</th>
                                        <th style={{ padding: '16px', textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                                                No missions found. Launch one!
                                            </td>
                                        </tr>
                                    ) : (
                                        templates.map(t => (
                                            <tr key={t.id} style={{ borderBottom: '1px solid #333' }}>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{t.title}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{t.description || 'No description'}</div>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ color: '#ccc' }}>
                                                        {activeTab === 'SOLO' ? (
                                                            <span style={{ background: '#444', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', marginRight: '8px' }}>
                                                                {t.type?.toUpperCase()}
                                                            </span>
                                                        ) : null}
                                                        <span style={{ color: '#FFC800', fontWeight: 'bold' }}>
                                                            {t.target_value || t.value} {t.target_metric || t.metric}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', fontWeight: 'bold', color: '#0f0' }}>
                                                    +{t.xp_reward} XP
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    {t.focus && t.focus.length > 0 ? (
                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                            {t.focus.map(tag => (
                                                                <span key={tag} style={{ fontSize: '0.7rem', background: '#333', border: '1px solid #444', padding: '2px 6px', borderRadius: '4px', color: '#aaa' }}>
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#444', fontStyle: 'italic', fontSize: '0.8rem' }}>Universal</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => router.push(`/admin/missions/create?scope=${activeTab}&id=${t.id}`)}
                                                        style={{
                                                            background: '#333',
                                                            border: '1px solid #555',
                                                            color: '#fff',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(t.id, t.title)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: '1px solid #500',
                                                            color: '#f55',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="mobile-view" style={{ display: 'none', flexDirection: 'column', gap: '16px' }}>
                            {templates.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#666', background: '#222', borderRadius: '16px' }}>
                                    No missions found. Launch one!
                                </div>
                            ) : (
                                templates.map(t => (
                                    <div key={t.id} style={{ background: '#222', padding: '20px', borderRadius: '16px', border: '1px solid #333' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{t.title}</div>
                                            <div style={{ color: '#0f0', fontWeight: 'bold' }}>+{t.xp_reward} XP</div>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '16px' }}>{t.description || 'No description'}</div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                            {activeTab === 'SOLO' && (
                                                <span style={{ background: '#444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#ccc' }}>
                                                    {t.type?.toUpperCase()}
                                                </span>
                                            )}
                                            <span style={{ background: 'rgba(255, 200, 0, 0.1)', border: '1px solid #FFC800', color: '#FFC800', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                {t.target_value || t.value} {t.target_metric || t.metric}
                                            </span>
                                        </div>

                                        {t.focus && t.focus.length > 0 && (
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                                {t.focus.map(tag => (
                                                    <span key={tag} style={{ fontSize: '0.8rem', background: '#333', border: '1px solid #444', padding: '2px 8px', borderRadius: '4px', color: '#aaa' }}>
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => router.push(`/admin/missions/create?scope=${activeTab}&id=${t.id}`)}
                                                style={{
                                                    flex: 1,
                                                    background: '#333',
                                                    border: '1px solid #555',
                                                    color: '#fff',
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id, t.title)}
                                                style={{
                                                    flex: 1,
                                                    background: 'transparent',
                                                    border: '1px solid #500',
                                                    color: '#f55',
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                Delete Template
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <style jsx>{`
                            @media (max-width: 768px) {
                                .desktop-view { display: none !important; }
                                .mobile-view { display: flex !important; }
                            }
                        `}</style>
                    </>
                )}
            </div>
        </div>
    );
}
