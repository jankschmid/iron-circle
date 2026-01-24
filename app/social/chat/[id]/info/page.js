"use client";

import { useStore } from '@/lib/store';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function GroupInfoPage() {
    const { user, friends, addMemberToGroup, renameGroup, leaveGroup } = useStore();
    const router = useRouter();
    const params = useParams();
    const supabase = createClient();
    const chatId = params.id;

    const [chat, setChat] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [showAddMember, setShowAddMember] = useState(false);

    useEffect(() => {
        if (!chatId) return;
        fetchGroupDetails();
    }, [chatId]);

    const fetchGroupDetails = async () => {
        setLoading(true);
        try {
            // 1. Get Chat Info
            const { data: convo } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', chatId)
                .single();

            if (!convo) throw new Error("Chat not found");
            setChat(convo);
            setNewName(convo.name);

            // 2. Get Participants IDs
            const { data: parts } = await supabase
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', chatId);

            if (parts && parts.length > 0) {
                const userIds = parts.map(p => p.user_id);

                // 3. Fetch Profiles manually
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
            fetchGroupDetails(); // Refresh list
        } catch (err) {
            alert("Failed to add member");
        }
    };

    const handleLeave = async () => {
        if (!confirm("Are you sure you want to leave this group?")) return;
        try {
            await leaveGroup(chatId);
            router.push('/social/chat');
        } catch (err) {
            alert("Failed to leave group");
        }
    };

    if (loading) return <div className="container" style={{ paddingTop: '40px' }}>Loading info...</div>;
    if (!chat) return <div className="container" style={{ paddingTop: '40px' }}>Group not found</div>;

    const availableFriends = friends.filter(f => !participants.some(p => p.id === f.id));

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href={`/social/chat/${chatId}`} style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                    ←
                </Link>
                <h1 style={{ fontSize: '1.5rem' }}>Group Info</h1>
            </header>

            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* Header / Rename */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'var(--surface-highlight)',
                        borderRadius: '50%',
                        margin: '0 auto 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem'
                    }}>
                        👥
                    </div>

                    {isEditingName ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                style={{
                                    background: 'var(--background)',
                                    border: '1px solid var(--primary)',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    color: 'var(--foreground)',
                                    textAlign: 'center',
                                    fontSize: '1.2rem'
                                }}
                            />
                            <button onClick={handleRename} style={{ background: 'var(--primary)', border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer' }}>✓</button>
                        </div>
                    ) : (
                        <h2 onClick={() => setIsEditingName(true)} style={{ fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            {chat.name} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>✎</span>
                        </h2>
                    )}
                    <p style={{ color: 'var(--text-muted)' }}>{participants.length} members</p>
                </div>

                {/* Participants */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1.1rem' }}>Members</h3>
                        <button
                            onClick={() => setShowAddMember(!showAddMember)}
                            style={{
                                color: 'var(--primary)',
                                background: 'transparent',
                                border: 'none',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
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
                    </div>
                </div>

                {/* Danger Zone */}
                <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={handleLeave}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'rgba(255, 23, 68, 0.1)',
                            color: 'var(--error)',
                            border: '1px solid var(--error)',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Leave Group
                    </button>
                </div>

            </div>
        </div>
    );
}
