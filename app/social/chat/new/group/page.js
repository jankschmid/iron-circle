"use client";

import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export default function NewGroupPage() {
    const { user, friends, createGroupChat } = useStore();
    const router = useRouter();
    const [name, setName] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [loading, setLoading] = useState(false);

    const toggleFriend = (id) => {
        setSelectedFriends(prev =>
            prev.includes(id)
                ? prev.filter(fid => fid !== id)
                : [...prev, id]
        );
    };

    const handleCreate = async () => {
        if (!name.trim() || selectedFriends.length === 0) return;
        setLoading(true);

        try {
            const newChatId = await createGroupChat(name, selectedFriends);
            router.push(`/social/chat/conversation?id=${newChatId}`);
        } catch (err) {
            console.error("Failed to create group:", err);
            alert("Failed to create group.");
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/social/chat/new" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                    ←
                </Link>
                <h1 style={{ fontSize: '1.5rem' }}>New Group</h1>
            </header>

            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Group Name */}
                <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '500' }}>Group Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Gym Bros"
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--background)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            color: 'var(--foreground)',
                            outline: 'none',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                {/* Friend Selector */}
                <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '500' }}>Participants</label>

                    {friends.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', background: 'var(--surface)', borderRadius: '12px' }}>
                            You need friends to add to a group.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {friends.map(friend => {
                                const isSelected = selectedFriends.includes(friend.id);
                                return (
                                    <div
                                        key={friend.id}
                                        onClick={() => toggleFriend(friend.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            background: isSelected ? 'var(--surface-highlight)' : 'transparent',
                                            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                            borderRadius: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            border: isSelected ? '6px solid var(--primary)' : '2px solid var(--text-muted)',
                                            marginRight: '8px'
                                        }} />
                                        <img
                                            src={friend.avatar}
                                            style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600' }}>{friend.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{friend.handle}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Submit */}
                <button
                    onClick={handleCreate}
                    disabled={!name.trim() || selectedFriends.length === 0 || loading}
                    style={{
                        padding: '16px',
                        background: 'var(--primary)',
                        color: '#000',
                        fontWeight: '700',
                        fontSize: '1rem',
                        border: 'none',
                        borderRadius: '100px',
                        cursor: 'pointer',
                        opacity: (!name.trim() || selectedFriends.length === 0 || loading) ? 0.5 : 1
                    }}
                >
                    {loading ? 'Creating...' : 'Create Group'}
                </button>

            </div>
        </div>
    );
}
