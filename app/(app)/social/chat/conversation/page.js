"use client";

import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import ErrorBoundary from '@/components/ErrorBoundary';
import MessageBubble from '@/components/Chat/MessageBubble';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactConfetti from 'react-confetti';

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

    // --- WAR ROOM (GROUP DASHBOARD) ---
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'chat'
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        if (conversation) {
            // Default to dashboard for groups, chat for private
            if (conversation.type === 'private') setViewMode('chat');
            else setViewMode('dashboard');
        }
    }, [conversation?.id, conversation?.type]);

    // 1. Resolve Conversation/User Logic
    useEffect(() => {
        if (!user || !chatId) return;

        const setupConversation = async () => {
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

    const messages = data?.pages ?
        [...data.pages].reverse().flatMap(page => [...page])
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
                if (newMsg.sender_id === user.id) return;

                const { data: sender } = await supabase.from('profiles').select('name, username, avatar_url').eq('id', newMsg.sender_id).single();

                queryClient.setQueryData(['messages', conversation.id], (oldData) => {
                    if (!oldData) return oldData;
                    const newPages = [...oldData.pages];
                    const firstPage = [...newPages[0]];
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
        return <div className="p-4 text-center">Loading...</div>;
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
                borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20, 20, 20, 0.95)',
                backdropFilter: 'blur(12px)', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => {
                            if (viewMode === 'chat' && conversation?.type !== 'private') {
                                setViewMode('dashboard');
                            } else {
                                router.push(conversation?.type === 'private' ? '/connect?tab=chat' : '/connect?tab=groups');
                            }
                        }}
                        style={{
                            fontSize: '1.2rem', color: 'var(--foreground)', border: 'none', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.1)', width: '32px', height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
                        }}
                    >
                        ←
                    </button>

                    {conversation && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Only show small avatar in Chat Mode or Private Chat */}
                            {(viewMode === 'chat' || conversation.type === 'private') && (
                                <img src={conversation.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${conversation.id}`} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
                            )}

                            <div>
                                <h1 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                                    {viewMode === 'chat' && conversation.type !== 'private' ? 'Comms Channel' : (conversation.name || 'Chat')}
                                </h1>
                                {conversation.type !== 'private' && viewMode === 'chat' && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Live</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Info / Actions */}
                {conversation && viewMode === 'dashboard' && (
                    <Link href={`/social/chat/conversation/info?id=${conversation.id}`} style={{
                        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.05)', borderRadius: '50%', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '1.2rem'
                    }}>
                        ⚙️
                    </Link>
                )}
            </header>

            {/* Content Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                paddingTop: 'calc(70px + env(safe-area-inset-top))',
                paddingBottom: '100px',
                background: viewMode === 'dashboard' && conversation?.type !== 'private' ? 'var(--background)' : 'transparent'
            }}>
                {viewMode === 'dashboard' && conversation?.type !== 'private' ? (
                    <>
                        <GroupDashboard conversation={conversation} />

                        {/* Floating Chat Button */}
                        <div style={{
                            position: 'fixed', bottom: '30px', right: '20px', zIndex: 20
                        }}>
                            <button
                                onClick={() => setViewMode('chat')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '16px 24px',
                                    background: 'var(--primary)',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '100px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                <span>💬</span>
                                <span>Open Comms</span>
                                {conversation.unreadCount > 0 && (
                                    <span style={{ background: '#000', color: '#FFF', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>
                                        {conversation.unreadCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    /* Chat Messages Area */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                        {/* Loader for previous messages */}
                        <div ref={observerTarget} style={{ height: '20px', width: '100%' }}>
                            {isFetchingNextPage && <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>Loading older messages...</div>}
                        </div>

                        {messages.map((msg, index) => {
                            const isMe = msg.sender_id === user?.id;
                            const prevMsg = messages[index - 1];
                            const isSequence = prevMsg && prevMsg.sender_id === msg.sender_id;
                            return (
                                <MessageBubble
                                    key={msg.id || index}
                                    msg={msg}
                                    isMe={isMe}
                                    isSequence={isSequence}
                                    onSaveTemplate={() => { }}
                                    onJoinSession={() => { }}
                                    savedTemplates={savedTemplates}
                                />
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area (Only visible in Chat Mode) */}
            {viewMode === 'chat' && (
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
                            placeholder="Type command..."
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
                            ➤
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

// Sub-component for Group Dashboard
function GroupDashboard({ conversation }) {
    const supabase = createClient();
    const { user } = useStore(); // Need user for contribution check
    const [leaderboard, setLeaderboard] = useState([]);
    const [metric, setMetric] = useState('VOLUME'); // VOLUME, WORKOUTS, DISTANCE
    const [activeGoal, setActiveGoal] = useState(null);
    const [userContribution, setUserContribution] = useState(0);
    const [communityId, setCommunityId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showConfetti, setShowConfetti] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

    // History Logic
    const [missionTab, setMissionTab] = useState('current'); // 'current' | 'history'
    const [missionHistory, setMissionHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Window size for Confetti
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        }
    }, []);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            let commId = null;
            // 1. Resolve Community ID
            if (conversation.gym_id) {
                const { data } = await supabase.from('communities').select('id').eq('gym_id', conversation.gym_id).single();
                if (data) commId = data.id;
            } else if (conversation.type === 'community' && conversation.metadata?.community_id) {
                // Future proofing
                commId = conversation.metadata.community_id;
            }

            if (commId) {
                setCommunityId(commId);

                // 2. Fetch Leaderboard
                const { data: lb } = await supabase.rpc('get_group_leaderboard', {
                    p_community_id: commId,
                    p_metric: metric
                });
                if (lb) setLeaderboard(lb);

                // 3. Fetch Active OR Completed Goal (Recent)
                const { data: goals } = await supabase
                    .from('community_goals')
                    .select('*')
                    .eq('community_id', commId)
                    .in('status', ['ACTIVE', 'COMPLETED'])
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (goals) {
                    setActiveGoal(goals);
                    // Fetch user contribution
                    const { data: contrib } = await supabase
                        .from('goal_contributions')
                        .select('contribution_amount')
                        .eq('goal_id', goals.id)
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (contrib) setUserContribution(contrib.contribution_amount);

                    // Trigger Confetti if completed
                    if (goals.status === 'COMPLETED') {
                        setShowConfetti(true);
                    }
                } else {
                    setActiveGoal(null);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [conversation, metric, user.id]);

    // Fetch History on Tab Change
    useEffect(() => {
        if (missionTab === 'history' && communityId) {
            const fetchHistory = async () => {
                setLoadingHistory(true);
                const { data } = await supabase
                    .from('community_goals')
                    .select('*')
                    .eq('community_id', communityId)
                    .in('status', ['COMPLETED', 'EXPIRED'])
                    .order('created_at', { ascending: false })
                    .limit(20);
                setMissionHistory(data || []);
                setLoadingHistory(false);
            };
            fetchHistory();
        }
    }, [missionTab, communityId]);

    const handleCreateGoal = async (preset) => {
        if (!communityId) return;

        const goalData = {
            community_id: communityId,
            metric: preset.metric,
            target_value: preset.target,
            current_value: 0,
            status: 'ACTIVE',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 Days
            xp_reward: preset.xp,
            title: preset.title
        };

        const { data, error } = await supabase.from('community_goals').insert(goalData).select().single();
        if (error) {
            alert('Failed to start mission');
            console.error(error);
        } else {
            setActiveGoal(data);
        }
    };

    const formatMetric = (val, m) => {
        if (m === 'VOLUME') return `${(val / 1000).toFixed(1)}k`;
        if (m === 'DISTANCE') return `${(val / 1000).toFixed(1)}k`; // meters -> km
        return val;
    };

    const getUnit = (m) => {
        if (m === 'VOLUME') return ' kg';
        if (m === 'DISTANCE') return ' km';
        return '';
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Intelligence...</div>;

    return (
        <div style={{ padding: '0 0 20px', position: 'relative' }}>
            {showConfetti && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, pointerEvents: 'none' }}>
                    {/* Dynamic import or check if ReactConfetti is available globally? Using conditional render if import works at file level */}
                    <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />
                </div>
            )}

            {/* Hero Section */}
            <div style={{
                padding: '40px 20px 20px',
                background: 'linear-gradient(180deg, rgba(20,20,20,0) 0%, var(--background) 100%)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                marginBottom: '20px'
            }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '24px',
                    background: 'var(--surface-highlight)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.5rem', border: '1px solid var(--border)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                }}>
                    {conversation.avatar ? <img src={conversation.avatar} style={{ width: '100%', height: '100%', borderRadius: '24px', objectFit: 'cover' }} /> : '🏛️'}
                </div>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.5rem', margin: '0 0 4px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                        {conversation.name || 'Unnamed Squad'}
                    </h1>
                    <div style={{ color: activeGoal?.status === 'COMPLETED' ? 'var(--success)' : 'var(--primary)', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {activeGoal ? (activeGoal.status === 'COMPLETED' ? 'MISSION ACCOMPLISHED' : 'Mission Active') : 'On Standby'}
                    </div>
                </div>
            </div>

            <div style={{ padding: '0 20px' }}>
                {/* Mission Tabs */}
                <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
                    <button
                        onClick={() => setMissionTab('current')}
                        style={{
                            padding: '0 0 12px', background: 'none', border: 'none',
                            color: missionTab === 'current' ? 'var(--foreground)' : 'var(--text-muted)',
                            borderBottom: missionTab === 'current' ? '2px solid var(--primary)' : '2px solid transparent',
                            fontWeight: '600', cursor: 'pointer'
                        }}>
                        Current Mission
                    </button>
                    <button
                        onClick={() => setMissionTab('history')}
                        style={{
                            padding: '0 0 12px', background: 'none', border: 'none',
                            color: missionTab === 'history' ? 'var(--foreground)' : 'var(--text-muted)',
                            borderBottom: missionTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
                            fontWeight: '600', cursor: 'pointer'
                        }}>
                        Mission Log
                    </button>
                </div>

                {missionTab === 'current' ? (
                    <>
                        {/* activeGoal Logic (Same as before) */}
                        {activeGoal ? (
                            <div style={{
                                background: activeGoal.status === 'COMPLETED' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, #1a1a1a 100%)' : 'linear-gradient(135deg, var(--surface) 0%, #1a1a1a 100%)',
                                borderRadius: '16px', padding: '20px',
                                border: activeGoal.status === 'COMPLETED' ? '1px solid var(--success)' : '1px solid var(--primary)',
                                marginBottom: '24px', boxShadow: '0 0 20px rgba(226, 232, 240, 0.05)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', color: activeGoal.status === 'COMPLETED' ? 'var(--success)' : 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        {activeGoal.status === 'COMPLETED' ? 'VICTORY' : 'Active Mission'}
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: '#fff' }}>Ends {new Date(activeGoal.expires_at).toLocaleDateString()}</span>
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 16px' }}>{activeGoal.title || 'Team Goal'}</h2>

                                {/* Progress */}
                                <div style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                                    <div style={{
                                        width: `${Math.min(100, (activeGoal.current_value / activeGoal.target_value) * 100)}%`,
                                        height: '100%',
                                        background: activeGoal.status === 'COMPLETED' ? 'var(--success)' : 'var(--primary)',
                                        borderRadius: '6px',
                                        transition: 'width 1s ease-in-out'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    <span>
                                        {formatMetric(activeGoal.current_value, activeGoal.metric)}
                                        /
                                        {formatMetric(activeGoal.target_value, activeGoal.metric)}
                                        {getUnit(activeGoal.metric)}
                                    </span>
                                    <span>{Math.round((activeGoal.current_value / activeGoal.target_value) * 100)}%</span>
                                </div>
                                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    ✅ You have contributed {Math.round((userContribution / activeGoal.target_value) * 100)}%
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                background: 'var(--surface)', borderRadius: '16px', padding: '20px',
                                marginBottom: '24px', border: '1px dashed var(--text-muted)', textAlign: 'center'
                            }}>
                                <h3 style={{ margin: '0 0 12px', color: 'var(--text-muted)' }}>NO ACTIVE MISSION</h3>
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                    <button onClick={() => handleCreateGoal({ title: 'Op: Heavy Lift', metric: 'VOLUME', target: 500000, xp: 500 })}
                                        style={{ flex: 1, minWidth: '120px', padding: '12px', background: 'var(--surface-highlight)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--foreground)' }}>
                                        <div style={{ fontSize: '1.5rem' }}>🏋️‍♂️</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Heavy Lift</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>500k kg Vol</div>
                                    </button>
                                    <button onClick={() => handleCreateGoal({ title: 'Op: Iron Lungs', metric: 'DISTANCE', target: 500000, xp: 500 })} // 500km in meters
                                        style={{ flex: 1, minWidth: '120px', padding: '12px', background: 'var(--surface-highlight)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--foreground)' }}>
                                        <div style={{ fontSize: '1.5rem' }}>🏃</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Iron Lungs</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>500 km</div>
                                    </button>
                                    <button onClick={() => handleCreateGoal({ title: 'Op: Discipline', metric: 'WORKOUTS', target: 50, xp: 500 })}
                                        style={{ flex: 1, minWidth: '120px', padding: '12px', background: 'var(--surface-highlight)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--foreground)' }}>
                                        <div style={{ fontSize: '1.5rem' }}>📅</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Discipline</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>50 Workouts</div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* History Tab */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        {loadingHistory ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Archives...</div>
                        ) : missionHistory.length > 0 ? (
                            missionHistory.map(m => (
                                <div key={m.id} style={{
                                    background: 'var(--surface)', borderRadius: '12px', padding: '16px',
                                    border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: m.status === 'COMPLETED' ? 'var(--success)' : 'var(--error)' }}>
                                            {m.title}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {new Date(m.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                            {formatMetric(m.current_value, m.metric)} / {formatMetric(m.target_value, m.metric)} {getUnit(m.metric)}
                                        </div>
                                        <div style={{
                                            fontSize: '0.7rem',
                                            color: m.status === 'COMPLETED' ? 'var(--success)' : 'var(--error)',
                                            background: m.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '4px'
                                        }}>
                                            {m.status}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: '16px' }}>
                                No completed missions in the archives.
                            </div>
                        )}
                    </div>
                )}

                {/* Leaderboard */}
                <div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {['VOLUME', 'WORKOUTS', 'DISTANCE'].map(m => (
                            <button key={m}
                                onClick={() => setMetric(m)}
                                style={{
                                    padding: '8px 16px', borderRadius: '100px', border: 'none',
                                    background: metric === m ? 'var(--foreground)' : 'var(--surface)',
                                    color: metric === m ? 'var(--background)' : 'var(--text-muted)',
                                    fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer'
                                }}>
                                {m}
                            </button>
                        ))}
                    </div>

                    <div style={{ background: 'var(--surface)', borderRadius: '16px', overflow: 'hidden' }}>
                        {leaderboard.length > 0 ? leaderboard.map((entry, idx) => (
                            <div key={entry.user_id} style={{
                                display: 'flex', alignItems: 'center', padding: '12px 16px',
                                borderBottom: '1px solid var(--border-light)',
                                opacity: entry.value === 0 ? 0.5 : 1 // Shame list effect
                            }}>
                                <div style={{ width: '24px', fontWeight: 'bold', color: idx < 3 ? 'var(--primary)' : 'var(--text-muted)' }}>#{entry.rank}</div>
                                <img src={entry.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%', marginRight: '12px' }} />
                                <div style={{ flex: 1, fontWeight: '500' }}>{entry.username || 'Agent'}</div>
                                <div style={{ fontWeight: 'bold' }}>
                                    {formatMetric(entry.value, metric)}
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                        {getUnit(metric)}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No data for this week.
                            </div>
                        )}
                    </div>
                </div>
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
