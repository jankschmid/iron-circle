"use client";

import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import CommunitiesModal from '@/components/CommunitiesModal';

export default function NewChatPage() {
    const { user, friends, fetchCommunities, joinCommunity } = useStore();
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [showCommunitiesModal, setShowCommunitiesModal] = useState(false);

    const handleStartChat = async (friend) => {
        if (loading) return;
        setLoading(true);

        try {
            // 1. Check if ANY private conversation exists with this user
            // We need to check if there is a 'private' conversation where BOTH I and THE FRIEND are participants.

            // Step A: Get all my private conversation IDs
            const { data: myConvos } = await supabase
                .from('conversation_participants')
                .select('conversation_id, conversation:conversations(type)')
                .eq('user_id', user.id);

            const privateConvoIds = myConvos
                .filter(c => c.conversation?.type === 'private')
                .map(c => c.conversation_id);

            // Step B: Check if Friend is in any of these
            if (privateConvoIds.length > 0) {
                const { data: common } = await supabase
                    .from('conversation_participants')
                    .select('conversation_id')
                    .in('conversation_id', privateConvoIds)
                    .eq('user_id', friend.id)
                    .maybeSingle();

                if (common) {
                    // Chat exists -> Redirect
                    router.push(`/social/chat/conversation?id=${common.conversation_id}`);
                    return;
                }
            }

            // 2. If not, Create New Conversation
            const { data: newConvo, error: createError } = await supabase
                .from('conversations')
                .insert({
                    type: 'private',
                    name: null // Private chats are named dynamically
                })
                .select()
                .single();

            if (createError) throw createError;

            // 3. Add Participants
            const { error: partError } = await supabase
                .from('conversation_participants')
                .insert([
                    { conversation_id: newConvo.id, user_id: user.id },
                    { conversation_id: newConvo.id, user_id: friend.id }
                ]);

            if (partError) throw partError;

            // 4. Redirect
            router.push(`/social/chat/conversation?id=${newConvo.id}`);

        } catch (err) {
            console.error("Error starting chat:", err);
            alert("Failed to start chat. See console.");
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/chat" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                    ←
                </Link>
                <h1 style={{ fontSize: '1.5rem' }}>New Message</h1>
            </header>

            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                        onClick={() => router.push('/social/chat/new/group')}
                        style={{
                            padding: '16px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ fontSize: '1.5rem' }}>👥</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>New Group</span>
                    </button>
                    <button
                        onClick={() => setShowCommunitiesModal(true)}
                        style={{
                            padding: '16px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ fontSize: '1.5rem' }}>📢</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Find Community</span>
                    </button>
                </div>

                {/* Communities Modal */}
                {showCommunitiesModal && (
                    <CommunitiesModal
                        onClose={() => setShowCommunitiesModal(false)}
                        fetchCommunities={fetchCommunities}
                        joinCommunity={joinCommunity}
                        user={user}
                        onSuccess={(conversationId) => {
                            setShowCommunitiesModal(false);
                            if (conversationId) {
                                router.push(`/social/chat/conversation?id=${conversationId}`);
                            } else {
                                router.push('/chat');
                            }
                        }}
                    />
                )}

                <div style={{ marginTop: '16px' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Suggested</h3>

                    {friends.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                            You need friends to message!<br />
                            <Link href="/social/add" style={{ color: 'var(--primary)', fontWeight: '600' }}>Find Friends +</Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {friends.map(friend => (
                                <div
                                    key={friend.id}
                                    onClick={() => handleStartChat(friend)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        background: 'transparent',
                                        borderBottom: '1px solid var(--border)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <img
                                        src={friend.avatar}
                                        style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600' }}>{friend.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{friend.handle}</div>
                                    </div>
                                    <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>›</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
