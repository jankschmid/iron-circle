"use client";

import { useStore } from '@/lib/store';
import Link from 'next/link';
import { useState } from 'react';
import { useConversations } from '@/hooks/useChatQueries';
import CommunitiesModal from '@/components/CommunitiesModal';
import { useTranslation } from '@/context/TranslationContext';
import { createClient } from '@/lib/supabase';

export default function GroupsTab() {
    const { t } = useTranslation();
    const { user, fetchCommunities, joinCommunity } = useStore();
    const [showCommunitiesModal, setShowCommunitiesModal] = useState(false);

    const {
        data: conversations = [],
        isLoading: loading,
        refetch
    } = useConversations(user?.id);

    // Filter for Groups & Communities
    const groupChats = conversations.filter(c => c.type === 'group' || c.type === 'community' || c.type === 'gym');
    const activeGroups = groupChats.filter(c => c.isMember !== false);

    if (loading) return <div className="p-4 text-center">Loading Groups...</div>;

    return (
        <div style={{ paddingBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Action Header */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                    onClick={() => setShowCommunitiesModal(true)}
                    style={{
                        padding: '8px 16px',
                        background: 'var(--surface-highlight)',
                        border: '1px solid var(--border)',
                        borderRadius: '100px',
                        color: 'var(--foreground)',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    + {t('Find Community')}
                </button>
                <Link href="/social/chat/new/group">
                    <button
                        style={{
                            padding: '8px 16px',
                            background: 'var(--primary)',
                            border: 'none',
                            borderRadius: '100px',
                            color: '#000',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        + {t('New Squad')}
                    </button>
                </Link>
            </div>

            {activeGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🛡️</div>
                    <h3>{t('No Squads Yet')}</h3>
                    <p>{t('Join a community or create a squad with friends.')}</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                    {activeGroups.map(group => (
                        <GroupCard key={group.id} group={group} />
                    ))}
                </div>
            )}

            {showCommunitiesModal && (
                <CommunitiesModal
                    onClose={() => setShowCommunitiesModal(false)}
                    fetchCommunities={fetchCommunities}
                    joinCommunity={joinCommunity}
                    user={user}
                    onSuccess={(id) => {
                        setShowCommunitiesModal(false);
                        refetch();
                    }}
                />
            )}
        </div>
    );
}

function GroupCard({ group }) {
    // Determine visuals based on type
    const isCommunity = group.type === 'community' || group.type === 'gym';
    const icon = isCommunity ? '🏛️' : '⚔️';

    return (
        <Link href={`/social/chat/conversation?id=${group.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'transform 0.2s',
                cursor: 'pointer'
            }}>
                <div style={{
                    width: '50px', height: '50px',
                    borderRadius: '12px',
                    background: 'var(--surface-highlight)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem',
                    border: '1px solid var(--border)'
                }}>
                    {group.avatar ? <img src={group.avatar} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} /> : icon}
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold' }}>{group.name || 'Unnamed Squad'}</h3>
                        {/* Status Dot */}
                        {group.unreadCount > 0 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {isCommunity ? 'Community HQ' : 'Tactical Squad'}
                    </div>
                </div>
            </div>
        </Link>
    );
}
