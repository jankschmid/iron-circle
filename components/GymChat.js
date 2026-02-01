"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MessageBubble from '@/components/Chat/MessageBubble';

export default function GymChat({ communityId, news }) {
    const supabase = createClient();
    const { user } = useStore();
    const queryClient = useQueryClient();

    const [conversation, setConversation] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // 1. Resolve Conversation from Community ID
    useEffect(() => {
        const fetchConvo = async () => {
            // Find conversation of type 'community' (or 'gym'?) linked to this community
            // We need to know how communities are linked.
            // Usually community.id -> conversation context or metadata?
            // Existing logic: "joinCommunity" creates/finds conversation.

            // Let's search for a conversation that is LINKED to this community.
            // Assuming we stored community_id in conversation metadata or we search participants?
            // Actually, in `app/community/page.js`, we join and get `conversationId`.
            // But here we are just viewing.

            // Let's try to find a conversation for this gym/community.
            // Schema check: conversations table has gym_id? Yes?
            // Let's look up conversations where type='community' AND gym_id = (gym of this community) OR just linked to this community.

            // For now, let's assume we can fetch it via the community-gym link.
            // Strategy: 
            // A. Fetch community -> get Gym ID.
            // B. Fetch conversation where type='community' AND gym_id = community.gym_id (if 1:1)

            const { data: comm } = await supabase.from('communities').select('gym_id').eq('id', communityId).single();
            if (!comm) return;

            const { data: convo } = await supabase.from('conversations')
                .select('*')
                .eq('gym_id', comm.gym_id)
                .eq('type', 'community') // or 'gym'? User called it 'gym' in page.js sometimes
                .limit(1)
                .maybeSingle(); // Use maybeSingle to avoid 406 if multiple (shouldn't be)

            // If explicit conversation not found, we might need a fallback or create one? 
            // Ideally it exists because user is member.
            if (convo) {
                setConversation(convo);
            }
        };
        fetchConvo();
    }, [communityId]);

    // 2. Chat Query (Same as existing Chat, simplified)
    const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ['messages', conversation?.id],
        queryFn: async ({ pageParam = 0 }) => {
            if (!conversation?.id) return [];
            const to = (pageParam + 1) * 50 - 1;
            const from = pageParam * 50;

            const { data: msgs } = await supabase
                .from('messages')
                .select('*, sender:sender_id(id, username, avatar_url)')
                .eq('conversation_id', conversation.id)
                .order('created_at', { ascending: false })
                .range(from, to);

            return msgs.reverse();
        },
        enabled: !!conversation?.id,
        getNextPageParam: (lastPage, all) => lastPage.length === 50 ? all.length : undefined
    });

    const messages = data?.pages ? data.pages.flat() : [];

    // 3. Realtime
    useEffect(() => {
        if (!conversation?.id) return;
        const channel = supabase.channel(`gym_chat:${conversation.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
                (payload) => {
                    if (payload.new.sender_id !== user?.id) queryClient.invalidateQueries(['messages', conversation.id]);
                })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [conversation?.id]);

    // 4. Send Mutation
    const sendMutation = useMutation({
        mutationFn: async (txt) => {
            return await supabase.from('messages').insert({ conversation_id: conversation.id, sender_id: user.id, content: txt });
        },
        onSuccess: () => {
            setNewMessage('');
            queryClient.invalidateQueries(['messages', conversation.id]);
        }
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]); // Scroll on new message

    if (!conversation) return <div style={{ padding: '20px', color: '#666', textAlign: 'center' }}>Loading Chat...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
            {/* Pinned News */}
            {news && news.length > 0 && (
                <div style={{
                    background: '#222', padding: '12px', borderRadius: '8px', marginBottom: '16px',
                    borderLeft: '4px solid #faff00', display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <span style={{ fontSize: '0.75rem', color: '#faff00', fontWeight: 'bold', textTransform: 'uppercase' }}>📢 Pinned News</span>
                    <strong style={{ fontSize: '0.9rem' }}>{news[0].title}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#ccc' }}>{news[0].content}</span>
                </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '20px' }}>
                {/* Load More Trigger could go here */}
                {messages.map((msg, i) => (
                    <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isMe={msg.sender_id === user?.id}
                        isSequence={i > 0 && messages[i - 1].sender_id === msg.sender_id}
                        savedTemplates={new Set()}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={(e) => { e.preventDefault(); if (newMessage.trim()) sendMutation.mutate(newMessage); }}
                style={{
                    display: 'flex', gap: '8px', background: '#222', padding: '8px',
                    borderRadius: '100px', border: '1px solid #333', marginTop: 'auto'
                }}>
                <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Message the gym..."
                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', padding: '8px 16px', outline: 'none' }}
                />
                <button type="submit" style={{
                    background: '#faff00', color: '#000', border: 'none', width: '36px', height: '36px',
                    borderRadius: '50%', fontWeight: 'bold', cursor: 'pointer'
                }}>
                    ➤
                </button>
            </form>
        </div>
    );
}
