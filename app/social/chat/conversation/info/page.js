"use client";

import { useStore } from '@/lib/store';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase';
import ErrorBoundary from '@/components/ErrorBoundary';

function ChatInfoContent() {
    const { user, friends, addMemberToGroup, renameGroup, leaveGroup, saveUserGym } = useStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const chatId = searchParams.get('id');

    const [chat, setChat] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [inactiveMembers, setInactiveMembers] = useState([]);
    const [showInactive, setShowInactive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [showAddMember, setShowAddMember] = useState(false);
    const [community, setCommunity] = useState(null);
    const [gym, setGym] = useState(null);
    const [isMember, setIsMember] = useState(true);
    const [confirmDialog, setConfirmDialog] = useState(null);

    useEffect(() => {
        if (!chatId) return;
        fetchGroupDetails();
    }, [chatId]);

    const fetchGroupDetails = async () => {
        setLoading(true);
        try {
            const { data: convo } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', chatId)
                .maybeSingle();

            if (!convo) return;
            setChat(convo);
            setNewName(convo.name);

            const { data: parts } = await supabase
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', chatId);

            if (parts && parts.length > 0) {
                const userIds = parts.map(p => p.user_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name, username, avatar_url')
                    .in('id', userIds);

                if (profiles) {
                    setParticipants(profiles.map(p => ({
                        id: p.id,
                        name: p.name,
                        handle: '@' + p.username,
                        avatar: p.avatar_url
                    })));
                }
            } else {
                setParticipants([]);
            }

            if (convo.type === 'community' || convo.type === 'gym') {
                const { data: communityData, error: commError } = await supabase
                    .from('communities')
                    .select('*, gyms(id, name, address)')
                    .eq('gym_id', convo.gym_id)
                    .maybeSingle();

                if (communityData) {
                    setCommunity(communityData);
                    setGym(communityData.gyms);

                    const { data: allMembers } = await supabase
                        .from('community_members')
                        .select('user_id')
                        .eq('community_id', communityData.id);

                    if (allMembers && allMembers.length > 0) {
                        const allMemberIds = allMembers.map(m => m.user_id);
                        const participantIds = parts?.map(p => p.user_id) || [];
                        const activeIds = allMemberIds.filter(id => participantIds.includes(id));
                        const inactiveIds = participantIds.filter(id => !allMemberIds.includes(id));

                        if (parts) {
                            const activeProfiles = await supabase
                                .from('profiles')
                                .select('id, name, username, avatar_url')
                                .in('id', activeIds);

                            if (activeProfiles.data) {
                                setParticipants(activeProfiles.data.map(p => ({
                                    id: p.id,
                                    name: p.name,
                                    handle: '@' + p.username,
                                    avatar: p.avatar_url
                                })));
                            }
                        }

                        if (inactiveIds.length > 0) {
                            const { data: inactiveProfiles } = await supabase
                                .from('profiles')
                                .select('id, name, username, avatar_url')
                                .in('id', inactiveIds);

                            if (inactiveProfiles) {
                                setInactiveMembers(inactiveProfiles.map(p => ({
                                    id: p.id,
                                    name: p.name,
                                    handle: '@' + p.username,
                                    avatar: p.avatar_url
                                })));
                            }
                        }
                    }
                } else if (convo.gym_id) {
                    const { data: gymData } = await supabase
                        .from('gyms')
                        .select('id, name, address')
                        .eq('id', convo.gym_id)
                        .maybeSingle();

                    if (gymData) setGym(gymData);
                }

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
                        setIsMember(!!memberCheck);
                    } else {
                        setIsMember(false);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching group info:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRename = async () => {
        if (!newName.trim() || newName === chat.name) {
            setIsEditingName(false);
            return;
        }
        try {
            await renameGroup(chatId, newName);
            setChat(prev => ({ ...prev, name: newName }));
            setIsEditingName(false);
        } catch (err) {
            alert("Failed to rename group");
        }
    };

    const handleAddMember = async (friendId) => {
        try {
            await addMemberToGroup(chatId, friendId);
            setShowAddMember(false);
            fetchGroupDetails();
        } catch (err) {
            alert("Failed to add member");
        }
    };

    const handleLeave = async () => {
        setConfirmDialog({
            message: "Are you sure you want to leave this " + (chat.type === 'group' ? 'group' : 'community') + "?",
            type: 'confirm',
            onConfirm: async () => {
                try {
                    await leaveGroup(chatId);
                    setConfirmDialog(null);
                    router.push('/chat');
                } catch (err) {
                    setConfirmDialog({
                        message: "Failed to leave: " + err.message,
                        type: 'alert',
                        onConfirm: () => setConfirmDialog(null)
                    });
                }
            }
        });
    };

    const handleDelete = async () => {
        const isCommunity = chat.type === 'community' || chat.type === 'gym';

        setConfirmDialog({
            message: isCommunity && isMember
                ? `Delete this chat?\n\nDo you also want to leave the community?`
                : `Delete this chat from your list?`,
            type: 'confirm',
            showThreeOptions: isCommunity && isMember,
            onConfirm: async () => {
                try {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    await supabase
                        .from('conversation_participants')
                        .delete()
                        .eq('conversation_id', chatId)
                        .eq('user_id', authUser.id);

                    setConfirmDialog(null);
                    router.push('/chat');
                } catch (err) {
                    setConfirmDialog({
                        message: "Failed to delete: " + err.message,
                        type: 'alert',
                        onConfirm: () => setConfirmDialog(null)
                    });
                }
            },
            onConfirmAndLeave: async () => {
                try {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    if (community) {
                        await useStore.getState().leaveCommunity(community.id);
                    }
                    await supabase
                        .from('conversation_participants')
                        .delete()
                        .eq('conversation_id', chatId)
                        .eq('user_id', authUser.id);

                    setConfirmDialog(null);
                    router.push('/chat');
                } catch (err) {
                    setConfirmDialog({
                        message: "Failed: " + err.message,
                        type: 'alert',
                        onConfirm: () => setConfirmDialog(null)
                    });
                }
            }
        });
    };

    const handleAddGym = async () => {
        if (!gym) return;
        try {
            await saveUserGym(gym.name, null, null, gym.name, gym.address, 'manual');
            setConfirmDialog({
                message: `${gym.name} added to your gyms!`,
                type: 'alert',
                onConfirm: () => setConfirmDialog(null)
            });
        } catch (err) {
            setConfirmDialog({
                message: "Failed to add gym: " + err.message,
                type: 'alert',
                onConfirm: () => setConfirmDialog(null)
            });
        }
    };

    if (!chatId) return <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Chat ID missing</div>;
    if (loading) return <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Loading info...</div>;
    if (!chat) return <div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>Group not found</div>;

    const availableFriends = friends.filter(f => !participants.some(p => p.id === f.id));

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href={`/social/chat/conversation?id=${chatId}`} style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                    ←
                </Link>
                <h1 style={{ fontSize: '1.5rem' }}>{chat.type === 'community' || chat.type === 'gym' ? 'Community Info' : 'Group Info'}</h1>
            </header>

            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '80px', height: '80px', background: 'var(--surface-highlight)', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                        👥
                    </div>

                    {isEditingName ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                style={{ background: 'var(--background)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '8px', color: 'var(--foreground)', textAlign: 'center', fontSize: '1.2rem' }}
                            />
                            <button onClick={handleRename} style={{ background: 'var(--primary)', border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer' }}>✓</button>
                        </div>
                    ) : (
                        <h2 onClick={() => setIsEditingName(true)} style={{ fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            {chat.name} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>✎</span>
                        </h2>
                    )}
                    <p style={{ color: 'var(--text-muted)' }}>{participants.length} members</p>
                    {community && community.description && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '400px', margin: '8px auto 0' }}>
                            {community.description}
                        </p>
                    )}
                </div>

                {(chat.type === 'community' || chat.type === 'gym') && gym && (
                    <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🏋️ Gym Location
                        </h3>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{gym.name}</div>
                            {gym.address && (
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    📍 {gym.address}
                                </div>
                            )}
                        </div>
                        {user?.gyms?.some(g => g.id === gym.id) ? (
                            <div style={{ width: '100%', padding: '12px', background: 'var(--surface-highlight)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center' }}>
                                ✓ Already Added
                            </div>
                        ) : (
                            <button
                                onClick={handleAddGym}
                                style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                + Add This Gym to My List
                            </button>
                        )}
                    </div>
                )}

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1.1rem' }}>Members</h3>
                        <button
                            onClick={() => setShowAddMember(!showAddMember)}
                            style={{ color: 'var(--primary)', background: 'transparent', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                        >
                            + Add Member
                        </button>
                    </div>

                    {showAddMember && (
                        <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--surface)', borderRadius: '12px' }}>
                            <h4 style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Select Friend to Add</h4>
                            {availableFriends.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No friends available to add.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {availableFriends.map(f => (
                                        <div key={f.id} onClick={() => handleAddMember(f.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                                            <img src={f.avatar} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                            <span>{f.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {participants.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                <div>
                                    <div style={{ fontWeight: '500' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.handle}</div>
                                </div>
                                {p.id === user?.id && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', background: 'var(--surface-highlight)', padding: '2px 8px', borderRadius: '4px' }}>You</span>}
                            </div>
                        ))}

                        {inactiveMembers.length > 0 && (
                            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                <button
                                    onClick={() => setShowInactive(!showInactive)}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px 0', fontSize: '0.9rem' }}
                                >
                                    <span>Inactive Members ({inactiveMembers.length})</span>
                                    <span style={{ transform: showInactive ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                                </button>
                                {showInactive && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                        {inactiveMembers.map(p => (
                                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.6 }}>
                                                <img src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`} style={{ width: '40px', height: '40px', borderRadius: '50%', filter: 'grayscale(50%)' }} />
                                                <div>
                                                    <div style={{ fontWeight: '500' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.handle}</div>
                                                </div>
                                                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Left</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {isMember && (
                        <button
                            onClick={handleLeave}
                            style={{ width: '100%', padding: '16px', background: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', border: '1px solid #ff9800', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
                        >
                            {chat.type === 'community' || chat.type === 'gym' ? 'Leave Community' : 'Leave Group'}
                        </button>
                    )}

                    <button
                        onClick={handleDelete}
                        style={{ width: '100%', padding: '16px', background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', border: '1px solid var(--error)', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                        Delete Chat
                    </button>
                </div>
            </div>

            {confirmDialog && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '24px', color: 'var(--text-main)', whiteSpace: 'pre-line' }}>{confirmDialog.message}</p>
                        {confirmDialog.showThreeOptions ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button onClick={() => setConfirmDialog(null)} style={{ padding: '12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1rem' }}>Cancel</button>
                                <button onClick={confirmDialog.onConfirm} style={{ padding: '12px', background: 'var(--error)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>Just Delete Chat</button>
                                <button onClick={confirmDialog.onConfirmAndLeave} style={{ padding: '12px', background: '#ff9800', border: 'none', borderRadius: '8px', color: '#000', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>Delete & Leave Community</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setConfirmDialog(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1rem' }}>Cancel</button>
                                <button onClick={confirmDialog.onConfirm} style={{ flex: 1, padding: '12px', background: confirmDialog.type === 'alert' ? 'var(--primary)' : 'var(--error)', border: 'none', borderRadius: '8px', color: confirmDialog.type === 'alert' ? '#000' : '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>{confirmDialog.type === 'alert' ? 'OK' : 'Confirm'}</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Page() {
    return (
        <ErrorBoundary message="Info unavailable">
            <Suspense fallback={<div className="container" style={{ paddingTop: 'calc(40px + var(--safe-top))', textAlign: 'center' }}>Loading Info...</div>}>
                <ChatInfoContent />
            </Suspense>
        </ErrorBoundary>
    );
}
