"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function CommunityContent() {
    const searchParams = useSearchParams();
    const communityId = searchParams.get('id');
    const { user, joinCommunity, gyms } = useStore();
    const supabase = createClient();
    const router = useRouter();

    const [community, setCommunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (communityId) {
            fetchCommunity();
        } else {
            setLoading(false);
            setError("No Community ID provided.");
        }
    }, [communityId]);

    const fetchCommunity = async () => {
        try {
            const { data, error } = await supabase
                .from('communities')
                .select('*, gyms(name, address)')
                .eq('id', communityId)
                .single();

            if (error) throw error;
            setCommunity(data);
        } catch (err) {
            console.error("Fetch Community Error:", err);
            setError("Community not found.");
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!user) {
            // Redirect to login with return URL
            router.push(`/login?returnUrl=/community?id=${communityId}`);
            return;
        }

        setJoining(true);
        try {
            let consent = false;
            if (community.gym_type === 'verified_partner') {
                if (!confirm(`Join ${community.name}?\n\nBy joining this Gym, you agree to appear on the Live Monitor while working out here.`)) {
                    setJoining(false);
                    return;
                }
                consent = true;
            }

            const result = await joinCommunity(community.id, community.gym_id, community.gyms?.name || community.name, consent);

            // Success -> Redirect to Chat
            if (result?.conversationId) {
                router.push(`/social/chat/conversation?id=${result.conversationId}&type=community`);
            } else {
                router.push('/social/chat');
            }
        } catch (err) {
            alert("Failed to join: " + err.message);
        } finally {
            setJoining(false);
        }
    };

    if (loading) return <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>;
    if (error) return <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}>{error}</div>;

    const isMember = user?.gyms?.some(g => g.id === community.gym_id);

    return (
        <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

            <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏋️‍♂️</div>

                <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '8px' }}>{community.name}</h1>
                <p style={{ color: '#888', marginBottom: '8px' }}>{community.gyms?.name}</p>
                {community.gym_type === 'verified_partner' && <span style={{ background: '#FFC800', color: '#000', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold' }}>VERIFIED PARTNER</span>}

                <div style={{ background: '#222', borderRadius: '16px', padding: '24px', margin: '32px 0', border: '1px solid #333' }}>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#ccc' }}>
                        {community.description || "Join our community to track workouts, share progress, and compete on the leaderboard!"}
                    </p>
                    <div style={{ marginTop: '20px', color: '#666', fontSize: '0.9rem' }}>
                        👥 {community.member_count} Members
                    </div>
                </div>

                {isMember ? (
                    <Link
                        href={`/social/chat?tab=communities`} // Or direct deep link
                        style={{ display: 'block', width: '100%', padding: '16px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem' }}
                    >
                        Already a Member (Open App)
                    </Link>
                ) : (
                    <button
                        onClick={handleJoin}
                        disabled={joining}
                        style={{
                            width: '100%', padding: '16px',
                            background: '#FFC800', color: '#000',
                            border: 'none', borderRadius: '12px',
                            fontWeight: 'bold', fontSize: '1.2rem',
                            cursor: 'pointer', opacity: joining ? 0.7 : 1
                        }}
                    >
                        {user ? (joining ? 'Joining...' : 'Join Community') : 'Login to Join'}
                    </button>
                )}

                <div style={{ marginTop: '24px' }}>
                    <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>Back to Home</Link>
                </div>
            </div>
        </div>
    );
}

export default function CommunityLandingPage() {
    return (
        <Suspense fallback={<div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>}>
            <CommunityContent />
        </Suspense>
    );
}
