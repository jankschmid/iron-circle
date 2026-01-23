"use client";

import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function ChatPage() {
    const { user } = useStore();
    const router = useRouter();
    const params = useParams();
    const supabase = createClient();

    // Unwrap params safely
    const [chatId, setChatId] = useState(null);
    useEffect(() => {
        if (params?.id) setChatId(params.id);
    }, [params]);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [conversation, setConversation] = useState(null);
    const messagesEndRef = useRef(null);

    // Initial Fetch
    useEffect(() => {
        if (!user || !chatId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                let targetConvoId = chatId;
                let convoData = null;

                // 1. Check if chatId is a valid Conversation UUID
                const { data: directConvo } = await supabase
                    .from('conversations')
                    .select('*')
                    .eq('id', chatId)
                    .maybeSingle();

                if (directConvo) {
                    convoData = directConvo;
                } else {
                    // Fallback: Assume chatId is a User ID query
                    const { data: myConvos } = await supabase
                        .from('conversation_participants')
                        .select('conversation_id')
                        .eq('user_id', user.id);

                    if (myConvos && myConvos.length > 0) {
                        const myConvoIds = myConvos.map(c => c.conversation_id);
                        const { data: common } = await supabase
                            .from('conversation_participants')
                            .select('conversation_id')
                            .in('conversation_id', myConvoIds)
                            .eq('user_id', chatId)
                            .maybeSingle();

                        if (common) {
                            targetConvoId = common.conversation_id;
                            const { data: foundConvo } = await supabase
                                .from('conversations')
                                .select('*')
                                .eq('id', targetConvoId)
                                .single();
                            convoData = foundConvo;
                        }
                    }

                    if (!convoData) {
                        const { data: newConvo, error: createError } = await supabase
                            .from('conversations')
                            .insert({ type: 'private' })
                            .select()
                            .single();

                        if (createError) throw createError;

                        await supabase.from('conversation_participants').insert([
                            { conversation_id: newConvo.id, user_id: user.id },
                            { conversation_id: newConvo.id, user_id: chatId }
                        ]);

                        convoData = newConvo;
                        targetConvoId = newConvo.id;
                    }
                }

                // Resolve Header Info (Name/Avatar)
                // Resolve Header Info (Name/Avatar) - MANUAL FETCH FIX
                if (convoData.type === 'private') {
                    // 1. Find other participant ID
                    const { data: otherMember } = await supabase
                        .from('conversation_participants')
                        .select('user_id')
                        .eq('conversation_id', targetConvoId)
                        .neq('user_id', user.id)
                        .maybeSingle();

                    if (otherMember) {
                        // 2. Fetch Profile Manually
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('name, username, avatar_url')
                            .eq('id', otherMember.user_id)
                            .maybeSingle();

                        if (profile) {
                            convoData.name = profile.name;
                            convoData.avatar = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherMember.user_id}`;
                            convoData.otherUserId = otherMember.user_id;
                        } else {
                            convoData.name = 'Unknown User';
                            convoData.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherMember.user_id}`;
                        }
                    } else {
                        convoData.name = 'Unknown User';
                    }
                }

                setConversation(convoData);

                // 2. Fetch Messages
                const { data: msgs, error: msgError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', targetConvoId)
                    .order('created_at', { ascending: true });

                if (msgError) throw msgError;

                // 3. Hydrate Profiles
                const senderIds = [...new Set(msgs?.map(m => m.sender_id) || [])];
                let profilesMap = {};

                profilesMap[user.id] = {
                    name: user.name,
                    username: user.handle?.replace('@', ''),
                    avatar_url: user.avatar
                };

                const idsToFetch = senderIds.filter(id => id !== user.id);

                if (idsToFetch.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, name, username, avatar_url')
                        .in('id', idsToFetch);

                    if (profiles) {
                        profiles.forEach(p => profilesMap[p.id] = p);
                    }
                }

                const hydratedMessages = (msgs || []).map(m => ({
                    ...m,
                    sender: profilesMap[m.sender_id] || { name: 'Unknown', avatar_url: null }
                }));

                setMessages(hydratedMessages);

                // 4. Subscribe
                const channel = supabase
                    .channel(`chat:${targetConvoId}`)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `conversation_id=eq.${targetConvoId}`
                    }, async (payload) => {
                        const newMsg = payload.new;

                        // Don't add if I sent it (Optimistic UI handles it)
                        if (newMsg.sender_id === user.id) return;

                        const { data: senderProfile } = await supabase
                            .from('profiles')
                            .select('name, username, avatar_url')
                            .eq('id', newMsg.sender_id)
                            .single();

                        setMessages(prev => [...prev, { ...newMsg, sender: senderProfile }]);
                    })
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };

            } catch (err) {
                console.error("Chat Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, chatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversation) return;

        const text = newMessage.trim();
        setNewMessage('');

        // Optimistic UI Update
        const tempId = 'temp-' + Date.now();
        const optimisticMsg = {
            id: tempId,
            conversation_id: conversation.id,
            sender_id: user.id,
            content: text,
            created_at: new Date().toISOString(),
            sender: {
                name: user.name,
                username: user.handle?.replace('@', ''),
                avatar_url: user.avatar
            }
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversation.id,
                    sender_id: user.id,
                    content: text
                });

            if (error) {
                console.error("Postgres insert failed:", error);
                setMessages(prev => prev.filter(m => m.id !== tempId));
                alert("Failed to send message");
            }
        } catch (err) {
            console.error("Send exception:", err);
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    if (loading) return <div className="container" style={{ paddingTop: '40px' }}>Loading chat...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '480px', margin: '0 auto', background: 'var(--background)' }}>
            <header style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <Link href="/chat" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>←</Link>

                {conversation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                            src={conversation.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${conversation.id}`}
                            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                        />
                        <div>
                            <h1 style={{ fontSize: '1.1rem', margin: 0 }}>{conversation.name || 'Chat'}</h1>
                            {conversation.type === 'gym' && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Community</span>}
                        </div>
                    </div>
                )}
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map(msg => {
                    const isMe = msg.sender_id === user.id;
                    return (
                        <div key={msg.id} style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                        }}>
                            <div style={{
                                background: isMe ? 'var(--primary)' : 'var(--surface)',
                                color: isMe ? '#000' : 'var(--foreground)',
                                padding: '10px 16px',
                                borderRadius: '18px',
                                borderTopRightRadius: isMe ? '4px' : '18px',
                                borderTopLeftRadius: isMe ? '18px' : '4px',
                                fontSize: '0.95rem'
                            }}>
                                {msg.content}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: isMe ? 'right' : 'left', marginLeft: '8px', marginRight: '8px' }}>
                                {!isMe && msg.sender?.name + ' • '}
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} style={{ padding: '16px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '24px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    style={{
                        padding: '0 20px',
                        borderRadius: '24px',
                        background: 'var(--primary)',
                        color: '#000',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                        opacity: !newMessage.trim() ? 0.5 : 1
                    }}>
                    Send
                </button>
            </form>
        </div>
    );
}
