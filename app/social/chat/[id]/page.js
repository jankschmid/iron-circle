"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';

export default function ChatPage() {
    const { user, getChat, sendMessage } = useStore();
    const [messageText, setMessageText] = useState('');
    const [chatData, setChatData] = useState(null);
    const router = useRouter();
    const params = useParams();

    const chatId = params.id;

    useEffect(() => {
        const chat = getChat(chatId);
        if (chat) {
            setChatData(chat);
        }
    }, [chatId, getChat]);

    const handleSend = () => {
        if (!messageText.trim()) return;
        sendMessage(chatId, messageText);
        setMessageText('');
        // Refresh chat data locally to show update (since getChat grabs ref)
        // In real app subscriptions would handle this
        const updated = getChat(chatId); // Re-fetch
        setChatData({ ...updated });
    };

    if (!chatData) return <div className="container" style={{ paddingTop: '40px' }}>Loading chat...</div>;

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
            {/* Header */}
            <header style={{
                padding: '16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: 'var(--background)'
            }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--foreground)' }}>←</button>
                <div>
                    <h1 style={{ fontSize: '1.1rem', margin: 0 }}>{chatData.name}</h1>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{chatData.type === 'group' ? 'Group Chat' : 'Private Message'}</div>
                </div>
            </header>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {chatData.messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                        No messages yet. Start the conversation!
                    </div>
                )}

                {chatData.messages.map(msg => {
                    const isMe = msg.senderId === user.id;
                    return (
                        <div key={msg.id} style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '70%',
                            background: isMe ? 'var(--primary)' : 'var(--surface)',
                            color: isMe ? '#000' : 'var(--foreground)',
                            padding: '10px 14px',
                            borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0',
                            position: 'relative'
                        }}>
                            {!isMe && <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '4px' }}>{msg.senderName}</div>}
                            <div>{msg.text}</div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div style={{
                padding: '16px',
                borderTop: '1px solid var(--border)',
                background: 'var(--surface)',
                display: 'flex',
                gap: '8px'
            }}>
                <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '24px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)'
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                    onClick={handleSend}
                    disabled={!messageText.trim()}
                    style={{
                        background: 'var(--primary)',
                        color: '#000',
                        border: 'none',
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ➤
                </button>
            </div>
        </div>
    );
}
