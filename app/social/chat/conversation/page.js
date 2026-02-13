"use client";

import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import ErrorBoundary from '@/components/ErrorBoundary';
import MessageBubble from '@/components/Chat/MessageBubble';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function ChatContent() {
    const { user, joinSession, acceptSharedTemplate } = useStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const queryClient = useQueryClient();

    const chatId = searchParams.get('id');
    const [newMessage, setNewMessage] = useState('');
    const [conversation, setConversation] = useState(null);
    const [isMember, setIsMember] = useState(true);

    const messagesEndRef = useRef(null);
    const observerTarget = useRef(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    // UI States
    const [savedTemplates, setSavedTemplates] = useState(new Set());
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // 1. Resolve Conversation/User Logic (Keep this, but maybe memoize or query it too?)
    // For now, keep it simple as an effect to setup the context.
    useEffect(() => {
        if (!user || !chatId) return;

        const setupConversation = async () => {
            // ... (Existing Resolution Logic from previous implementation)
            // simplified for brevity in this step, ideally this should be a useQuery too but let's stick to cleaning up the chat list first.
            // We'll reuse the logic but put it in a function.
            try {
                let targetConvoId = chatId;
                let convoData = null;

                const { data: directConvo } = await supabase
                    .from('conversations')
                    .select('*')
                    .eq('id', chatId)
                    .maybeSingle();

                if (directConvo) {
                    convoData = directConvo;
                } else {
                    // Fallback Logic
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
                            const { data: foundConvo } = await supabase.from('conversations').select('*').eq('id', targetConvoId).single();
                            convoData = foundConvo;
                        }
                    }

                    if (!convoData) {
                        const { data: newConvo, error } = await supabase.from('conversations').insert({ type: 'private' }).select().single();
                        if (error) throw error;
                        await supabase.from('conversation_participants').insert([
                            { conversation_id: newConvo.id, user_id: user.id },
                            { conversation_id: newConvo.id, user_id: chatId }
                        ]);
                        convoData = newConvo;
                        targetConvoId = newConvo.id;
                    }
                }

                // Header Info Resolution
                if (convoData.type === 'private') {
                    const { data: otherMember } = await supabase
                        .from('conversation_participants')
                        .select('user_id')
                        .eq('conversation_id', targetConvoId)
                        .neq('user_id', user.id)
                        .maybeSingle();

                    if (otherMember) {
                        const { data: profile } = await supabase.from('profiles').select('name, username, avatar_url').eq('id', otherMember.user_id).maybeSingle();
                        if (profile) {
                            convoData.name = profile.name;
                            convoData.avatar = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherMember.user_id}`;
                        }
                    }
                }

                setConversation(convoData);

                // Check Membership & Fix Name
                if (convoData.type === 'community' || convoData.type === 'gym') {
                    // Fetch Gym Name
                    if (convoData.gym_id) {
                        const { data: gym } = await supabase.from('gyms').select('name').eq('id', convoData.gym_id).maybeSingle();
                        if (gym) {
                            convoData.name = gym.name;
                        }
                    }

                    const { data: communityData } = await supabase.from('communities').select('id').eq('gym_id', convoData.gym_id).maybeSingle();
                    if (communityData) {
                        const { data: mem } = await supabase.from('community_members').select('user_id').eq('community_id', communityData.id).eq('user_id', user.id).maybeSingle();
                        setIsMember(!!mem);
                    }
                }

            } catch (e) { console.error(e); }
        };

        setupConversation();
    }, [user, chatId]);


    // 2. TantStack Query: Infinite Messages
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status
    } = useInfiniteQuery({
        queryKey: ['messages', conversation?.id],
        queryFn: async ({ pageParam = 0 }) => {
            if (!conversation?.id) return [];

            const limit = 50;
            const from = pageParam * limit;
            const to = from + limit - 1;

            // 1. Fetch messages (raw)
            const { data: msgs, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversation.id)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            // 2. Manual Join: Fetch Sender Profiles
            const senderIds = [...new Set(msgs.map(m => m.sender_id))];

            if (senderIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name, username, avatar_url')
                    .in('id', senderIds);

                // Map profiles to messages
                const profileMap = new Map(profiles?.map(p => [p.id, p]));

                return msgs.map(msg => ({
                    ...msg,
                    sender: profileMap.get(msg.sender_id) || { name: 'Unknown', avatar_url: null }
                })).reverse();
            }

            return msgs.reverse();
        },
        getNextPageParam: (lastPage, allPages) => {
            // If we got less than limit, we are at the end
            return lastPage.length === 50 ? allPages.length : undefined;
        },
        enabled: !!conversation?.id,
        staleTime: 1000 * 60, // 1 minute
    });

    // Flatten pages for rendering
    // Note: Since we fetch desc and reverse each page, simply concatenating [page0, page1] won't work for "Load Previous" style.
    // Standard approach: Fetch DESC. Page 0 is (Now -> -50). Page 1 is (-50 -> -100).
    // To render: [...Page1.reverse(), ...Page0.reverse()]
    // But since we want "Prepend", TanStack handles pages.
    // Let's adjust: queryFn returns DESC order.
    // Render: Iterate pages in reverse order (Page N ... Page 0).
    // Within each page, reverse the items to be chronological.

    // Easier way: Fetch DESC. 
    // Data structure: { pages: [ [Msg-1...Msg-50] (Newest), [Msg-51...Msg-100] (Older) ] }
    // We want to render: [ ...Page1(reversed), ...Page0(reversed) ]

    const messages = data?.pages ?
        [...data.pages].reverse().flatMap(page => [...page]) // page is already reversed in queryFn?
        // Wait. queryFn: .order('created_at', { ascending: false }).
        // msgs[0] is Newest. msgs[49] is Oldest in that batch.
        // We returned msgs.reverse(). So msgs[0] is Oldest, msgs[49] is Newest.
        // Page 0: [Oldest ... Newest (Now)]
        // Page 1: [Older ... Older-Newest]
        // If we just render Page 1 then Page 0, we get: [Older ... Older-Newest, Oldest ... Newest]
        // This is correct chronological order!
        // So: flatMap is all we need if queryFn returns reversed chunks.
        : [];


    // 3. Realtime Subscription
    useEffect(() => {
        if (!conversation?.id) return;

        const channel = supabase
            .channel(`chat:${conversation.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversation.id}`
            }, async (payload) => {
                const newMsg = payload.new;
                // Avoid double insertion if optimistic update already handled it (by ID check usually, but ID is temp)
                // TanStack Query invalidate works best.

                // If it's me, my optimistic update handles it. Wait for revalidation or ignore.
                // Actually, listening to my own inserts causes dupes if not careful.
                if (newMsg.sender_id === user.id) return;

                // Invalidate query to refetch latest (or manually update cache)
                // Manually updating cache is smoother.
                // We need the sender profile though.
                const { data: sender } = await supabase.from('profiles').select('name, username, avatar_url').eq('id', newMsg.sender_id).single();

                queryClient.setQueryData(['messages', conversation.id], (oldData) => {
                    if (!oldData) return oldData;
                    // Append to the *first* page (which is the newest page in our DESC fetching logic, represented as the last page in pages array?)
                    // Actually data.pages[0] is the FIRST fetched page (Newest batch).
                    // We need to append to the end of the Last Rendered List.

                    // Helper: We can't easily modify the pages structure perfectly without deep clone.
                    // Proper way: Invalidate.
                    // queryClient.invalidateQueries(['messages', conversation.id]);

                    // But for smooth UI:
                    const newPages = [...oldData.pages];
                    const firstPage = [...newPages[0]]; // Page 0 is Newest-Batch

                    // Wait, in my queryFn logic: 
                    // Page 0 (Param 0) = Newest 50 messages. Returned as [Oldest -> Newest].
                    // So specific msg should be appended to Page 0?
                    // Yes, Page 0 is the "Bottom" of the chat.

                    firstPage.push({ ...newMsg, sender });
                    newPages[0] = firstPage;

                    return { ...oldData, pages: newPages };
                });

                setShouldAutoScroll(true);

            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [conversation?.id, queryClient]);


    // 4. Mutation (Send Message)
    const sendMessageMutation = useMutation({
        mutationFn: async (text) => {
            return await supabase.from('messages').insert({
                conversation_id: conversation.id,
                sender_id: user.id,
                content: text
            });
        },
        onMutate: async (text) => {
            await queryClient.cancelQueries(['messages', conversation.id]);
            const previousMessages = queryClient.getQueryData(['messages', conversation.id]);

            const optimisticMsg = {
                id: 'temp-' + Date.now(),
                content: text,
                created_at: new Date().toISOString(),
                sender_id: user.id,
                sender: { name: user.name, avatar_url: user.avatar },
                isOptimistic: true
            };

            queryClient.setQueryData(['messages', conversation.id], (old) => {
                if (!old) return { pages: [[optimisticMsg]], pageParams: [0] };
                const newPages = [...old.pages];
                // Append to Page 0 (Newest/Bottom)
                const page0 = [...newPages[0]];
                page0.push(optimisticMsg);
                newPages[0] = page0;
                return { ...old, pages: newPages };
            });

            setShouldAutoScroll(true);
            return { previousMessages };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['messages', conversation.id], context.previousMessages);
            alert("Failed to send message");
        },
        onSettled: () => {
            queryClient.invalidateQueries(['messages', conversation.id]);
        }
    });

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversation || !isMember) return;
        sendMessageMutation.mutate(newMessage);
        setNewMessage('');
        setShouldAutoScroll(true);
    };

    // Scroll Management
    useEffect(() => {
        if (shouldAutoScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            setShouldAutoScroll(false);
        }
    }, [messages, shouldAutoScroll]);

    // Setup Observer for "Load Previous"
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.5 }
        );

        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);


    if (!chatId) return <div className="container" style={{ paddingTop: 'calc(40px + env(safe-area-inset-top))', paddingLeft: '20px' }}>Chat ID missing</div>;

    if (status === 'pending') {
        return (
            <div style={{
                padding: 'calc(16px + env(safe-area-inset-top)) 20px',
                background: 'var(--background)',
                height: '100vh',
                maxWidth: '480px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ width: '120px', height: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{
                            alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start',
                            width: '60%', height: '60px',
                            background: 'rgba(255,255,255,0.05)', borderRadius: '12px'
                        }} />
                    ))}
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
            {/* Header */}
            <header style={{
                position: 'fixed', top: 0, width: '100%', maxWidth: '480px', zIndex: 10,
                padding: 'calc(16px + env(safe-area-inset-top)) 20px 16px', display: 'flex', alignItems: 'center', gap: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20, 20, 20, 0.8)',
                backdropFilter: 'blur(12px)', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href={conversation?.type === 'group' ? '/connect?tab=chat&subtab=groups' : (conversation?.type === 'community' || conversation?.type === 'gym') ? '/connect?tab=chat&subtab=communities' : '/connect?tab=chat'} style={{
                        fontSize: '1.2rem', color: 'var(--foreground)', textDecoration: 'none',
                        background: 'rgba(255,255,255,0.1)', width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
                    }}>←</Link>
                    {conversation && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={conversation.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${conversation.id}`} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div>
                                <h1 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{conversation.name || 'Chat'}</h1>
                                {conversation.type === 'gym' && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase' }}>Community</span>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Button */}
                {conversation && (
                    <Link href={`/social/chat/conversation/info?id=${conversation.id}`} style={{
                        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.1)', borderRadius: '50%', color: 'var(--foreground)', textDecoration: 'none', fontSize: '1.2rem'
                    }}>
                        ℹ
                    </Link>
                )}
            </header>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'calc(90px + env(safe-area-inset-top)) 16px 100px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {/* Loader for previous messages */}
                <div ref={observerTarget} style={{ height: '20px', width: '100%' }}>
                    {isFetchingNextPage && <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>Loading older messages...</div>}
                </div>

                {messages.map((msg, index) => {
                    // Reverse index logic? No, messages is already flat and sorted chronologically
                    const isMe = msg.sender_id === user?.id;
                    const prevMsg = messages[index - 1];
                    const isSequence = prevMsg && prevMsg.sender_id === msg.sender_id;

                    return (
                        <MessageBubble
                            key={msg.id || index}
                            msg={msg}
                            isMe={isMe}
                            isSequence={isSequence}
                            onSaveTemplate={(m) => {
                                // Re-implement saving logic calling acceptSharedTemplate
                            }}
                            onJoinSession={(m) => {
                                // Re-implement join logic
                            }}
                            savedTemplates={savedTemplates}
                        />
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area (Same as before) */}
            <div style={{
                position: 'fixed', bottom: 0, width: '100%', maxWidth: '480px',
                padding: '16px 16px 24px', background: 'linear-gradient(to top, var(--background) 80%, transparent)', zIndex: 10
            }}>
                <form onSubmit={handleSend} style={{
                    background: 'var(--surface-highlight, #2A2A2A)', border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', gap: '12px', padding: '8px', borderRadius: '100px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)', alignItems: 'center'
                }}>
                    <input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        disabled={!isMember}
                        style={{
                            flex: 1, padding: '12px 20px', background: 'transparent', border: 'none',
                            color: 'var(--foreground)', outline: 'none', fontSize: '1rem'
                        }}
                    />
                    <button type="submit" disabled={!newMessage.trim() || !isMember} style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: newMessage.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        color: newMessage.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        ✈️
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <ErrorBoundary message="Chat unavailable">
            <Suspense fallback={<div>Loading...</div>}>
                <ChatContent />
            </Suspense>
        </ErrorBoundary>
    );
}
