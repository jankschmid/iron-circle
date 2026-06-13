"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';

export default function ClientChat({ clientId, trainerId }) {
    const supabase = createClient();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!clientId || !trainerId) return;
        initChat();
    }, [clientId, trainerId]);

    const initChat = async () => {
        setLoading(true);
        try {
            // 1. Find existing private conversation between the two
            const { data: convos, error } = await supabase.rpc('get_direct_conversation', { p_user_a: trainerId, p_user_b: clientId });
            
            let convoId = null;
            if (convos && convos.length > 0) {
                convoId = convos[0].id;
            } else {
                // If RPC doesn't exist or fails, manual search (might be limited by RLS, but trainer_relationships should allow)
                // We'll create one directly if not found.
                const { data: newConvo } = await supabase.from('conversations').insert({ type: 'private' }).select().single();
                if (newConvo) {
                    await supabase.from('conversation_participants').insert([
                        { conversation_id: newConvo.id, user_id: trainerId },
                        { conversation_id: newConvo.id, user_id: clientId }
                    ]);
                    convoId = newConvo.id;
                }
            }

            if (convoId) {
                setConversation({ id: convoId });
                fetchMessages(convoId);

                // Subscribe to real-time messages
                const sub = supabase.channel(`public:messages:conversation_id=eq.${convoId}`)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convoId}` }, payload => {
                        setMessages(prev => [...prev, payload.new]);
                    })
                    .subscribe();

                return () => supabase.removeChannel(sub);
            }
        } catch (e) {
            console.error("Chat init error", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (convoId) => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convoId)
            .order('created_at', { ascending: true });
        
        if (data) setMessages(data);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversation) return;

        const content = newMessage;
        setNewMessage('');

        // Optimistic UI update could go here, but real-time covers it fast enough usually
        await supabase.from('messages').insert({
            conversation_id: conversation.id,
            sender_id: trainerId,
            content
        });
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Chat...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '500px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Direct Messages</h3>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>No messages yet.<br/>Say hello to your athlete!</div>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.sender_id === trainerId;
                        return (
                            <div key={msg.id} style={{
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '75%',
                                background: isMe ? 'var(--primary)' : 'var(--background)',
                                color: isMe ? 'black' : 'white',
                                padding: '12px 16px',
                                borderRadius: '16px',
                                borderBottomRightRadius: isMe ? '4px' : '16px',
                                borderBottomLeftRadius: !isMe ? '4px' : '16px',
                            }}>
                                {msg.content}
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--background)' }}>
                <input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '12px', borderRadius: '100px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'white' }}
                />
                <button type="submit" disabled={!newMessage.trim()} style={{
                    padding: '0 20px', borderRadius: '100px', background: newMessage.trim() ? 'var(--primary)' : 'var(--surface)', 
                    color: newMessage.trim() ? 'black' : 'var(--text-muted)', border: 'none', fontWeight: 'bold', cursor: 'pointer'
                }}>
                    Send
                </button>
            </form>
        </div>
    );
}
