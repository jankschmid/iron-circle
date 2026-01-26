"use client";

import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function ChatPage() {
    const { user, joinSession } = useStore();
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
    const initializingRef = useRef(false);

    // Initial Fetch
    useEffect(() => {
        if (!user || !chatId) return;

        const fetchData = async () => {
            // Prevent race condition (double invocation in Strict Mode)
            if (initializingRef.current) return;
            initializingRef.current = true;

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
                initializingRef.current = false;
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

    const [isLongLoading, setIsLongLoading] = useState(false);

    useEffect(() => {
        let timer;
        if (loading) {
            timer = setTimeout(() => setIsLongLoading(true), 3000);
        } else {
            setIsLongLoading(false);
        }
        return () => clearTimeout(timer);
    }, [loading]);

    if (loading) {
        if (isLongLoading) {
            return (
                <div className="container" style={{
                    paddingTop: '40px',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '24px'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'var(--surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        border: '1px solid var(--border)'
                    }}>
                        ⏳
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '8px' }}>Taking a while...</h3>
                        <p style={{ color: 'var(--text-muted)' }}>We're having trouble loading this chat.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Link href="/chat" style={{
                            padding: '12px 24px',
                            color: 'var(--text-muted)',
                            textDecoration: 'none',
                            fontWeight: '600'
                        }}>
                            Go Back
                        </Link>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '12px 24px',
                                background: 'var(--primary)',
                                border: 'none',
                                borderRadius: '100px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                color: '#000'
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--background)' }}>
                {/* Skeleton Header */}
                <header style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ width: '24px', height: '24px', background: 'var(--border)', borderRadius: '4px' }} />
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border)' }} />
                    <div style={{ width: '100px', height: '16px', background: 'var(--border)', borderRadius: '4px' }} />
                </header>

                {/* Skeleton Messages */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                    <div style={{ alignSelf: 'flex-start', width: '40%', height: '40px', background: 'var(--surface)', borderRadius: '12px', opacity: 0.6 }} />
                    <div style={{ alignSelf: 'flex-end', width: '50%', height: '60px', background: 'var(--surface)', borderRadius: '12px', opacity: 0.6 }} />
                    <div style={{ alignSelf: 'flex-start', width: '30%', height: '30px', background: 'var(--surface)', borderRadius: '12px', opacity: 0.6 }} />
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            maxWidth: '480px',
            margin: '0 auto',
            background: 'var(--background)',
            position: 'relative'
        }}>
            {/* Glass Header */}
            <header style={{
                position: 'fixed',
                top: 0,
                width: '100%',
                maxWidth: '480px',
                zIndex: 10,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(20, 20, 20, 0.8)', // Semi-transparent dark
                backdropFilter: 'blur(12px)',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href="/chat" style={{
                        fontSize: '1.2rem',
                        color: 'var(--foreground)',
                        textDecoration: 'none',
                        background: 'rgba(255,255,255,0.1)',
                        width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%'
                    }}>←</Link>

                    {conversation && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                                src={conversation.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${conversation.id}`}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                            <div>
                                <h1 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{conversation.name || 'Chat'}</h1>
                                {conversation.type === 'gym' && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Community</span>}
                            </div>
                        </div>
                    )}
                </div>

                {conversation && conversation.type === 'group' && (
                    <Link href={`/social/chat/${conversation.id}/info`} style={{ fontSize: '1.5rem', textDecoration: 'none', opacity: 0.8 }}>
                        ℹ️
                    </Link>
                )}
            </header>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '80px 16px 100px 16px', // Top pad for header, bottom for input
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {messages.map((msg, index) => {
                    const isMe = msg.sender_id === user.id;
                    const prevMsg = messages[index - 1];
                    const isSequence = prevMsg && prevMsg.sender_id === msg.sender_id;

                    return (
                        <div key={msg.id} style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '75%',
                            animation: 'fadeIn 0.3s ease-out'
                        }}>
                            {!isMe && !isSequence && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '12px' }}>
                                    {msg.sender?.name}
                                </div>
                            )}
                            <div style={{
                                background: isMe
                                    ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, var(--primary)) 100%)'
                                    : 'var(--surface-highlight, #333)',
                                color: isMe ? '#000' : 'var(--foreground)',
                                padding: '12px 16px',
                                borderRadius: '20px',
                                borderTopRightRadius: isMe && isSequence ? '4px' : '20px',
                                borderTopLeftRadius: !isMe && isSequence ? '4px' : '20px',
                                borderBottomRightRadius: isMe ? '4px' : '20px',
                                borderBottomLeftRadius: !isMe ? '4px' : '20px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                fontSize: '0.95rem',
                                lineHeight: '1.4'
                            }}>
                                {msg.type === 'invite' || msg.type === 'workout_invite' ? (
                                    <div style={{ minWidth: '200px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>🏋️</span>
                                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Gym Session Invite</span>
                                        </div>
                                        <div style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
                                            {msg.content}
                                        </div>
                                        {!isMe && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={async () => {
                                                        const success = await joinSession(msg.metadata?.groupId, msg.metadata?.gymId);
                                                        if (success) {
                                                            router.push('/tracker');
                                                        }
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        background: 'var(--brand-yellow)',
                                                        color: '#000',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem'
                                                    }}
                                                >
                                                    Join
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        // Just dismiss - could add a "declined" state to message
                                                        console.log("Declined invite");
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        background: 'rgba(255,255,255,0.1)',
                                                        color: 'var(--text-muted)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '8px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem'
                                                    }}
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    msg.content
                                )}
                            </div>
                            {!isSequence && (
                                <div style={{
                                    fontSize: '0.65rem',
                                    color: 'var(--text-dim)',
                                    marginTop: '4px',
                                    textAlign: isMe ? 'right' : 'left',
                                    padding: '0 4px',
                                    opacity: 0.7
                                }}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Floating Input Capsule */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                width: '100%',
                maxWidth: '480px',
                padding: '16px 16px 24px',
                background: 'linear-gradient(to top, var(--background) 80%, transparent)',
                zIndex: 10
            }}>
                <form
                    onSubmit={handleSend}
                    style={{
                        background: 'var(--surface-highlight, #2A2A2A)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        gap: '12px',
                        padding: '8px',
                        borderRadius: '100px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        alignItems: 'center'
                    }}
                >
                    <input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        style={{
                            flex: 1,
                            padding: '12px 20px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--foreground)',
                            outline: 'none',
                            fontSize: '1rem'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: newMessage.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                            color: newMessage.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                            border: 'none',
                            cursor: newMessage.trim() ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            transform: newMessage.trim() ? 'scale(1)' : 'scale(0.95)'
                        }}>
                        <span style={{ fontSize: '1.2rem', transform: 'rotate(-45deg)', display: 'block', marginTop: '-2px' }}>✈️</span>
                    </button>
                </form>
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
