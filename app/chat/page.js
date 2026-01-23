"use client";

import { useStore } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

export default function ChatListPage() {
    const { chats, user, friends } = useStore();

    // We only show chats that exist in the 'chats' state. 
    // If a private chat hasn't been started (no message sent), it might not be here.
    // Ideally, we'd merge known friends who you might want to chat with, but for "inbox" view, 
    // showing active chats is standard.

    // Sort by last message timestamp if available
    const sortedChats = [...chats].sort((a, b) => {
        const lastA = a.messages[a.messages.length - 1];
        const lastB = b.messages[b.messages.length - 1];
        const timeA = lastA ? new Date(lastA.timestamp) : new Date(0);
        const timeB = lastB ? new Date(lastB.timestamp) : new Date(0);
        return timeB - timeA;
    });

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="text-gradient">Messages</h1>
                <Link href="/chat/create" style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    textDecoration: 'none'
                }}>
                    +
                </Link>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sortedChats.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No messages yet. Start a chat from the Social tab!
                    </div>
                )}

                {sortedChats.map(chat => {
                    const lastMsg = chat.messages[chat.messages.length - 1];
                    // For group chat use generic icon, for private use friend avatar logic (simplified here)
                    const isGroup = chat.type === 'group';

                    return (
                        <Link key={chat.id} href={`/social/chat/${chat.id}`} style={{
                            background: 'var(--surface)',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'center',
                            textDecoration: 'none',
                            color: 'inherit'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: isGroup ? 'var(--primary-dim)' : 'var(--surface-highlight)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                border: '1px solid var(--border)'
                            }}>
                                {isGroup ? '📣' : '👤'}
                            </div>

                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <div style={{ fontWeight: '600', fontSize: '1rem' }}>{chat.name}</div>
                                    {lastMsg && (
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                                <div style={{
                                    color: 'var(--text-muted)',
                                    fontSize: '0.9rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {lastMsg ? (
                                        <span>
                                            {lastMsg.senderId === user.id ? 'You: ' : `${lastMsg.senderName}: `}
                                            {lastMsg.text}
                                        </span>
                                    ) : (
                                        <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>No messages yet</span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            <BottomNav />
        </div>
    );
}
