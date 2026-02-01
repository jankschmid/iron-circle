"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import CommunitiesModal from '@/components/CommunitiesModal';
import { useConversations } from '@/hooks/useChatQueries';

import { Suspense } from 'react';

export default function ChatList() {
    return (
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
            <ChatListContent />
        </Suspense>
    );
}

function ChatListContent() {
    return (
        <div style={{ paddingBottom: '80px', background: 'var(--background)', minHeight: '100vh' }}>
            <ChatListInner />
            <BottomNav />
        </div>
    );
}

function ChatListInner() {
    const { user, fetchCommunities, joinCommunity, leaveCommunity } = useStore();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('messages'); // 'messages', 'groups', 'communities'
    const [showCommunitiesModal, setShowCommunitiesModal] = useState(false);

    // React Query Hook
    const {
        data: conversations = [],
        isLoading: loading,
        isError,
        error,
        refetch
    } = useConversations(user?.id);

    const [showInactiveCommunities, setShowInactiveCommunities] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);

    // Handle auto-opening communities modal
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['messages', 'groups', 'communities'].includes(tab)) {
            setActiveTab(tab);
        }

        if (searchParams.get('openCommunities') === 'true') {
            setActiveTab('communities');
            setShowCommunitiesModal(true);
        }
    }, [searchParams]);

    // Filtering logic
    const filteredConversations = conversations.filter(c => {
        if (activeTab === 'messages') return c.type === 'private';
        if (activeTab === 'groups') return c.type === 'group';
        if (activeTab === 'communities') return c.type === 'community' || c.type === 'gym';
        return true;
    });

    // Separate Communities Logic (Keep existing store calls for now if needed, or query them too)
    // For 'communities' tab, we display the filtered conversations (which include joined communities).
    // The "Find Communities" button opens the modal.

    // ... (Keep render logic mostly same, but use `filteredConversations` and `loading` from hook)

    const handleConfirm = () => {
        if (confirmDialog?.onConfirm) confirmDialog.onConfirm();
        setConfirmDialog(null);
    };

    if (loading) {
        return (
            <div style={{ maxWidth: '480px', margin: '0 auto', padding: 'calc(16px + env(safe-area-inset-top)) 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Header Skeleton */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ width: '80px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                </div>
                {/* Tabs Skeleton */}
                <div style={{ height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '20px' }} />

                {/* List Items */}
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ width: '40%', height: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                            <div style={{ width: '80%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (isError) {
        return <div className="p-4 text-center text-red-500" style={{ paddingTop: 'calc(40px + env(safe-area-inset-top))' }}>Error loading chats: {error.message}</div>;
    }

    // Split into active and inactive (left) communities
    const activeConversations = filteredConversations.filter(c => c.isMember !== false);
    const inactiveConversations = filteredConversations.filter(c => c.isMember === false);

    return (
        <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <header style={{
                padding: 'calc(16px + env(safe-area-inset-top)) 20px 16px',
                background: 'rgba(20, 20, 20, 0.8)',
                backdropFilter: 'blur(12px)',
                position: 'sticky', top: 0, zIndex: 10,
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', margin: 0 }}>Chat</h1>

                    {/* Add Action Button */}
                    {activeTab === 'communities' ? (
                        <button
                            onClick={() => setShowCommunitiesModal(true)}
                            style={{ background: 'var(--primary)', color: '#000', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            +
                        </button>
                    ) : (
                        <Link href={activeTab === 'groups' ? '/social/chat/new/group' : '/social/chat/new'} style={{ textDecoration: 'none' }}>
                            <div style={{ background: 'var(--primary)', color: '#000', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                +
                            </div>
                        </Link>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
                    {['messages', 'groups', 'communities'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1, padding: '8px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '500',
                                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                                color: activeTab === tab ? '#000' : '#888',
                                transition: 'all 0.2s ease', border: 'none', cursor: 'pointer'
                            }}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </header>

            {/* Chat List */}
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {activeConversations.length === 0 && !loading ? (
                    <div style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
                        <p>No chats found.</p>
                        {activeTab === 'communities' && (
                            <button
                                onClick={() => setShowCommunitiesModal(true)}
                                style={{ marginTop: '16px', background: 'var(--primary)', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Find Communities
                            </button>
                        )}
                        {activeTab === 'messages' && (
                            <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>Start a workout with friends to chat!</p>
                        )}
                        {activeTab === 'groups' && (
                            <Link href="/social/chat/new/group">
                                <button style={{ marginTop: '16px', background: 'var(--primary)', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    Create Group
                                </button>
                            </Link>
                        )}
                    </div>
                ) : (
                    activeConversations.map(chat => (
                        <ChatCard key={chat.id} chat={chat} onUpdate={refetch} setConfirmDialog={setConfirmDialog} />
                    ))
                )}

                {/* Inactive Communities Toggle */}
                {inactiveConversations.length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                        <button
                            onClick={() => setShowInactiveCommunities(!showInactiveCommunities)}
                            style={{ background: 'transparent', border: 'none', color: '#666', width: '100%', textAlign: 'center', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            {showInactiveCommunities ? 'Hide' : 'Show'} Left Communities ({inactiveConversations.length})
                        </button>
                    </div>
                )}
            </div>

            {showInactiveCommunities && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    {inactiveConversations.map(chat => (
                        <ChatCard key={chat.id} chat={chat} onUpdate={fetchConversations} setConfirmDialog={setConfirmDialog} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ChatCard({ chat, onUpdate, setConfirmDialog }) {
    const { leaveCommunity } = useStore();
    const [showMenu, setShowMenu] = useState(false);
    const supabase = createClient();

    const handleLeave = async () => {
        setConfirmDialog({
            message: `Leave ${chat.name}?`,
            type: 'confirm',
            onConfirm: async () => {
                try {
                    const { data: { user: authUser } } = await supabase.auth.getUser();

                    if (chat.type === 'community' || chat.type === 'gym') {
                        const { data: community } = await supabase
                            .from('communities')
                            .select('id')
                            .eq('gym_id', chat.gym_id)
                            .maybeSingle();

                        if (community) await leaveCommunity(community.id);
                    } else if (chat.type === 'group') {
                        // For groups, remove from conversation_participants
                        await supabase
                            .from('conversation_participants')
                            .delete()
                            .eq('conversation_id', chat.id)
                            .eq('user_id', authUser.id);
                    }

                    if (onUpdate) onUpdate(); // Refetch query? Actually query invalidation is handled by parent refetch
                } catch (e) {
                    console.error("Leave error:", e);
                }
            }
        });
    };

    const handleDelete = async () => {
        // Implement delete logic if needed
        console.log("Delete chat", chat.id);
    }

    return (
        <div style={{ position: 'relative' }}>
            <Link href={(chat.type === 'community' || chat.type === 'gym')
                ? `/community?gymId=${chat.gym_id}`
                : `/social/chat/conversation?id=${chat.id}`
            } style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: 'var(--surface)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    opacity: chat.isMember === false ? 0.5 : 1,
                    filter: chat.isMember === false ? 'grayscale(50%)' : 'none'
                }}>
                    <img src={chat.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.id}`} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.name || 'Chat'}</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {chat.timestamp ? new Date(chat.timestamp).toLocaleDateString() : ''}
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {chat.lastMessage?.content || chat.lastMessage || 'No messages'}
                        </p>
                    </div>

                    {/* Menu Trigger */}
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '8px', cursor: 'pointer', zIndex: 5 }}>
                        ⋮
                    </button>
                </div>
            </Link>

            {/* Menu Dropdown */}
            {showMenu && (
                <>
                    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(false); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
                    <div style={{
                        position: 'absolute',
                        right: '16px',
                        top: '50px',
                        background: 'var(--surface-highlight)',
                        borderRadius: '8px',
                        padding: '8px',
                        zIndex: 100,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        minWidth: '120px'
                    }}>
                        {(chat.type !== 'private') && (
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLeave(); }} style={{ background: 'transparent', border: 'none', color: 'var(--error)', padding: '8px', width: '100%', textAlign: 'left', cursor: 'pointer', fontWeight: 'bold' }}>
                                Leave
                            </button>
                        )}
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '8px', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                            Delete
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}


