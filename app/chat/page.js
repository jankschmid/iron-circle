"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase';
import CommunitiesModal from '@/components/CommunitiesModal';

function ChatListContent() {
    const { user, fetchCommunities, joinCommunity, leaveCommunity } = useStore();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('messages'); // 'messages', 'groups', 'communities'
    const [showCommunitiesModal, setShowCommunitiesModal] = useState(false);
    const searchParams = useSearchParams();
    const supabase = createClient();
    const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm, type }
    const [showInactiveCommunities, setShowInactiveCommunities] = useState(false);

    useEffect(() => {
        if (!user) return;
        fetchConversations();
    }, [user]);

    // Handle auto-opening communities modal
    useEffect(() => {
        if (searchParams.get('openCommunities') === 'true') {
            setActiveTab('communities');
            setShowCommunitiesModal(true);
        }
    }, [searchParams]);

    const fetchConversations = async () => {
        setLoading(true);
        try {
            // 1. Fetch conversations I'm in
            const { data: myConvos, error: partError } = await supabase
                .from('conversation_participants')
                .select('conversation_id, last_read_at')
                .eq('user_id', user.id);

            if (partError) throw partError;
            if (!myConvos || myConvos.length === 0) {
                setConversations([]);
                setLoading(false);
                return;
            }

            const conversationIds = myConvos.map(c => c.conversation_id);

            // 2. Fetch details
            const { data: conversationsData, error: convError } = await supabase
                .from('conversations')
                .select('id, type, name, gym_id')
                .in('id', conversationIds);

            if (convError) throw convError;

            // 3. Process details (last message, other participant)
            const processed = (await Promise.all(conversationsData.map(async (convo) => {
                const participantInfo = myConvos.find(p => p.conversation_id === convo.id);
                // Last message
                const { data: lastMsg } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', convo.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                let displayName = convo.name;
                let avatar = null;

                // If private, find the other person
                if (convo.type === 'private') {
                    const { data: other } = await supabase
                        .from('conversation_participants')
                        .select('user_id')
                        .eq('conversation_id', convo.id)
                        .neq('user_id', user.id)
                        .maybeSingle();

                    if (other) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('name, avatar_url')
                            .eq('id', other.user_id)
                            .maybeSingle();

                        if (profile) {
                            displayName = profile.name;
                            avatar = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${other.user_id}`;
                        }
                    }
                }

                // Check if user is still a member (for communities)
                let isMember = true;
                if (convo.type === 'community' || convo.type === 'gym') {
                    const { data: communityData } = await supabase
                        .from('communities')
                        .select('id')
                        .eq('gym_id', convo.gym_id)
                        .maybeSingle();

                    if (communityData) {
                        const { data: memberCheck } = await supabase
                            .from('community_members')
                            .select('user_id')
                            .eq('community_id', communityData.id)
                            .eq('user_id', user.id)
                            .maybeSingle();

                        isMember = !!memberCheck;
                    } else {
                        isMember = false;
                    }
                }

                return {
                    id: convo.id,
                    type: convo.type,
                    name: displayName,
                    avatar: avatar,
                    gym_id: convo.gym_id,
                    lastMessage: lastMsg?.content || 'No messages yet',
                    timestamp: lastMsg?.created_at || participantInfo?.last_read_at || new Date().toISOString(),
                    unread: false,
                    isMember: isMember
                };
            }))).filter(Boolean);

            // 4. Client-side deduplication logic
            const uniqueMap = new Map();
            processed.forEach(chat => {
                if (chat.type === 'gym' || chat.type === 'group' || chat.type === 'community') {
                    uniqueMap.set(chat.id, chat);
                } else {
                    // For private chats, group by name unique constraint proxy if id not stable
                    const key = `private:${chat.name}`;
                    if (!uniqueMap.has(key)) {
                        uniqueMap.set(key, chat);
                    } else {
                        const existing = uniqueMap.get(key);
                        if (new Date(chat.timestamp) > new Date(existing.timestamp)) {
                            uniqueMap.set(key, chat);
                        }
                    }
                }
            });

            const deduplicated = Array.from(uniqueMap.values());

            // Sort: Active chats first (by timestamp), then inactive chats (by timestamp)
            deduplicated.sort((a, b) => {
                // If one is inactive and the other is active, active comes first
                if (a.isMember !== b.isMember) {
                    return a.isMember ? -1 : 1;
                }
                // Otherwise sort by timestamp
                return new Date(b.timestamp) - new Date(a.timestamp);
            });

            setConversations(deduplicated);

        } catch (err) {
            console.error("Error fetching chats:", err);
        } finally {
            setLoading(false);
        }
    };

    // Filter based on active tab
    const filteredConversations = conversations.filter(c => {
        if (activeTab === 'messages') return c.type === 'private';
        if (activeTab === 'groups') return c.type === 'group';
        if (activeTab === 'communities') return c.type === 'gym' || c.type === 'community';
        return false;
    });

    // For communities tab, separate active and inactive
    const activeConversations = activeTab === 'communities'
        ? filteredConversations.filter(c => c.isMember !== false)
        : filteredConversations;
    const inactiveConversations = activeTab === 'communities'
        ? filteredConversations.filter(c => c.isMember === false)
        : [];

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Chats</h1>
                <Link href="/social/chat/new" style={{
                    padding: '10px 20px',
                    background: 'var(--primary)',
                    color: '#000',
                    borderRadius: '100px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                }}>
                    + New
                </Link>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <button onClick={() => setActiveTab('messages')} style={{ padding: '8px 16px', background: activeTab === 'messages' ? 'var(--primary)' : 'transparent', color: activeTab === 'messages' ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>💬 Messages</button>
                <button onClick={() => setActiveTab('groups')} style={{ padding: '8px 16px', background: activeTab === 'groups' ? 'var(--primary)' : 'transparent', color: activeTab === 'groups' ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>👥 Groups</button>
                <button onClick={() => setActiveTab('communities')} style={{ padding: '8px 16px', background: activeTab === 'communities' ? 'var(--primary)' : 'transparent', color: activeTab === 'communities' ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>🌐 Communities</button>
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ padding: '16px', background: 'var(--surface)', borderRadius: '12px', display: 'flex', gap: '16px', border: '1px solid var(--border)', opacity: 0.6 }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--border)' }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                                <div style={{ width: '40%', height: '14px', background: 'var(--border)', borderRadius: '4px' }} />
                                <div style={{ width: '70%', height: '12px', background: 'var(--border)', borderRadius: '4px' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredConversations.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                    {activeTab === 'messages' && (<>No messages yet.<br /><Link href="/social" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Find friends</Link> to start chatting!</>)}
                    {activeTab === 'groups' && 'No groups yet'}
                    {activeTab === 'communities' && 'No communities yet'}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Active chats */}
                    {activeConversations.map(chat => (
                        <ChatCard key={chat.id} chat={chat} onUpdate={fetchConversations} setConfirmDialog={setConfirmDialog} />
                    ))}

                    {/* Inactive communities dropdown */}
                    {inactiveConversations.length > 0 && (
                        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <button
                                onClick={() => setShowInactiveCommunities(!showInactiveCommunities)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '12px',
                                    fontSize: '0.9rem',
                                    borderRadius: '8px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-highlight)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span>Inactive Communities ({inactiveConversations.length})</span>
                                <span style={{ transform: showInactiveCommunities ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                            </button>
                            {showInactiveCommunities && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                    {inactiveConversations.map(chat => (
                                        <ChatCard key={chat.id} chat={chat} onUpdate={fetchConversations} setConfirmDialog={setConfirmDialog} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Communities Modal */}
            {showCommunitiesModal && (
                <CommunitiesModal
                    onClose={() => {
                        setShowCommunitiesModal(false);
                    }}
                    fetchCommunities={fetchCommunities}
                    joinCommunity={joinCommunity}
                    user={user}
                    onSuccess={(conversationId) => {
                        setShowCommunitiesModal(false);
                        if (conversationId) {
                            // If we have a router, push. If not, maybe just reload/fetch?
                            // This component uses useRouter? No, wait. ChatListPage doesn't import useRouter!
                            // I need to add useRouter import.
                            window.location.href = `/social/chat/${conversationId}`;
                        } else {
                            fetchConversations();
                        }
                    }}
                />
            )}

            {/* Confirmation Dialog */}
            {confirmDialog && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--surface)',
                        borderRadius: '16px',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '100%',
                        textAlign: 'center'
                    }}>
                        <p style={{
                            fontSize: '1.1rem',
                            marginBottom: '24px',
                            color: 'var(--text-main)',
                            whiteSpace: 'pre-line'
                        }}>
                            {confirmDialog.message}
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setConfirmDialog(null)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    fontSize: '1rem'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDialog.onConfirm}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: confirmDialog.type === 'alert' ? 'var(--primary)' : 'var(--error)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: confirmDialog.type === 'alert' ? '#000' : '#fff',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                {confirmDialog.type === 'alert' ? 'OK' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
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

                    setConfirmDialog(null);
                    await onUpdate();
                } catch (err) {
                    setConfirmDialog({
                        message: `Failed to leave: ${err.message}`,
                        type: 'alert',
                        onConfirm: () => setConfirmDialog(null)
                    });
                }
            }
        });
    };

    const handleDelete = async () => {
        setConfirmDialog({
            message: `Delete this chat?`,
            type: 'confirm',
            onConfirm: async () => {
                try {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    const { error } = await supabase
                        .from('conversation_participants')
                        .delete()
                        .eq('conversation_id', chat.id)
                        .eq('user_id', authUser.id);

                    if (error) {
                        throw new Error(error.message || 'Failed to delete chat');
                    }

                    setConfirmDialog(null);
                    await onUpdate();
                } catch (err) {
                    setConfirmDialog({
                        message: `Failed to delete: ${err.message}`,
                        type: 'alert',
                        onConfirm: () => setConfirmDialog(null)
                    });
                }
            }
        });
    };

    return (
        <div style={{ position: 'relative' }}>
            <Link href={`/social/chat/${chat.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                    background: 'var(--surface)',
                    padding: '16px 48px 16px 16px', // Extra right padding for menu button
                    borderRadius: '12px',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: chat.isMember === false ? 0.5 : 1,
                    filter: chat.isMember === false ? 'grayscale(50%)' : 'none'
                }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-highlight)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--surface)'}>
                    {chat.avatar ? (
                        <img src={chat.avatar} alt={chat.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                            {chat.type === 'gym' || chat.type === 'community' ? '🌐' : chat.type === 'group' ? '👥' : chat.name[0]}
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.name}</h3>
                                {chat.isMember === false && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '2px 6px',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        Inactive
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', marginLeft: '8px' }}>{new Date(chat.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.lastMessage}</p>
                    </div>
                </div>
            </Link>

            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }}
                style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)', // Vertically centered
                    right: '16px',
                    background: 'var(--surface-highlight)',
                    border: '1px solid var(--border)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    color: 'var(--text-muted)',
                    zIndex: 10
                }}>
                ⋮
            </button>

            {showMenu && (
                <>
                    <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
                    <div style={{ position: 'absolute', top: '50px', right: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 100, minWidth: '150px' }}>
                        {(chat.type === 'group' || chat.type === 'community' || chat.type === 'gym') && (
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(false); handleLeave(); }}
                                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-main)', borderBottom: '1px solid var(--border)' }}>
                                🚪 Leave {chat.type === 'group' ? 'Group' : 'Community'}
                            </button>
                        )}
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(false); handleDelete(); }}
                            style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--error)' }}>
                            🗑️ Delete Chat
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default function ChatListPage() {
    return (
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading chats...</div>}>
            <ChatListContent />
        </Suspense>
    );
}


