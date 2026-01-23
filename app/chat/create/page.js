"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';

export default function CreateChatPage() {
    const router = useRouter();
    const { friends, createGroupChat } = useStore();
    const [groupName, setGroupName] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);

    const toggleFriend = (id) => {
        if (selectedFriends.includes(id)) {
            setSelectedFriends(prev => prev.filter(fid => fid !== id));
        } else {
            setSelectedFriends(prev => [...prev, id]);
        }
    };

    const handleCreate = () => {
        if (!groupName.trim() || selectedFriends.length === 0) return;

        const chatId = createGroupChat(groupName, selectedFriends);
        router.push(`/social/chat/${chatId}`);
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/chat" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>←</Link>
                <h1 style={{ fontSize: '1.5rem' }}>New Group</h1>
            </header>

            <section>
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Group Name</label>
                    <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g. Morning Crew ☀️"
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--foreground)',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', marginBottom: '16px', color: 'var(--text-muted)' }}>Select Members</label>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {friends.map(friend => {
                            const isSelected = selectedFriends.includes(friend.id);
                            return (
                                <button
                                    key={friend.id}
                                    onClick={() => toggleFriend(friend.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        background: isSelected ? 'var(--surface-highlight)' : 'var(--surface)',
                                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--foreground)',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        border: isSelected ? '6px solid var(--primary)' : '2px solid var(--text-muted)',
                                        transition: 'all 0.2s'
                                    }} />
                                    <img
                                        src={friend.avatar}
                                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                    <span>{friend.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={handleCreate}
                    disabled={!groupName.trim() || selectedFriends.length === 0}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: (groupName.trim() && selectedFriends.length > 0) ? 'var(--primary)' : 'var(--surface-highlight)',
                        color: (groupName.trim() && selectedFriends.length > 0) ? '#000' : 'var(--text-muted)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: '700',
                        fontSize: '1.1rem',
                        transition: 'all 0.2s'
                    }}
                >
                    Create Group
                </button>
            </section>
        </div>
    );
}
