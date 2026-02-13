"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MessageBubble from '@/components/Chat/MessageBubble';

export default function GymChat({ communityId, gymId, news }) {
    const supabase = createClient();
    const { user } = useStore();
    const queryClient = useQueryClient();

    const [conversation, setConversation] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // 1. Resolve Conversation from Community ID
    useEffect(() => {
        const fetchConvo = async () => {
            // Priority: gymId (if passed) or community lookup
            // But conversation search depends on gym_id?

            // If we have gymId, we can search for conversation linked to this gym.
            const targetGymId = gymId;

            if (!targetGymId && !communityId) return;

            // Resolve gymId if missing
            let resolvedGymId = targetGymId;
            if (!resolvedGymId) {
                const { data: comm } = await supabase.from('communities').select('gym_id').eq('id', communityId).single();
                resolvedGymId = comm?.gym_id;
            }

            if (!resolvedGymId) return;

            const { data: convo } = await supabase.from('conversations')
                .select('*')
                .eq('gym_id', resolvedGymId)
                .in('type', ['gym', 'community']) // Allow both types
                .order('created_at', { ascending: true }) // Prefer oldest (original)
                .limit(1)
                .maybeSingle();

            if (convo) {
                setConversation(convo);

                // Auto-join if not participant
                if (user?.id) {
                    const { data: part } = await supabase
                        .from('conversation_participants')
                        .select('user_id')
                        .eq('conversation_id', convo.id)
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (!part) {
                        await supabase.from('conversation_participants').insert({
                            conversation_id: convo.id,
                            user_id: user.id
                        });
                        queryClient.invalidateQueries(['conversations', user.id]);
                    }
                }
            }
        };
        fetchConvo();
    }, [communityId, gymId, user?.id]);

    // 2. Chat Query & Staff Map
    const [staffMap, setStaffMap] = useState({});

    useEffect(() => {
        const fetchStaff = async () => {
            // Robust Gym ID resolving
            let gId = gymId;
            if (!gId && conversation?.gym_id) gId = conversation.gym_id;
            if (!gId && communityId) {
                const { data } = await supabase.from('communities').select('gym_id').eq('id', communityId).single();
                gId = data?.gym_id;
            }

            if (gId) {
                const { data: staff, error } = await supabase.from('user_gyms')
                    .select('user_id, role')
                    .eq('gym_id', gId)
                    .in('role', ['owner', 'admin', 'trainer']);

                if (staff) {
                    const map = {};
                    staff.forEach(s => map[s.user_id] = s.role);
                    setStaffMap(map);
                }
            }
        };
        fetchStaff();
    }, [gymId, conversation?.gym_id, communityId]);

    const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ['messages', conversation?.id],
        queryFn: async ({ pageParam = 0 }) => {
            if (!conversation?.id) return [];
            const to = (pageParam + 1) * 50 - 1;
            const from = pageParam * 50;

            const { data: msgs } = await supabase
                .from('messages')
                .select('*, sender:sender_id(id, username, avatar_url, is_super_admin)')
                .eq('conversation_id', conversation.id)
                .order('created_at', { ascending: false })
                .range(from, to);

            return msgs.reverse();
        },
        enabled: !!conversation?.id,
        getNextPageParam: (lastPage, all) => lastPage.length === 50 ? all.length : undefined
    });

    const rawMessages = data?.pages ? data.pages.flat() : [];
    const messages = rawMessages.map(m => ({
        ...m,
        sender: {
            ...m.sender,
            role: staffMap[m.sender_id]
        }
    }));

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
