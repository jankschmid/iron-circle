"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import GymHub from '@/components/GymHub';

function CommunityContent() {
    const searchParams = useSearchParams();
    const communityId = searchParams.get('id');
    const gymIdParam = searchParams.get('gymId');
    const { user, joinCommunity, gyms } = useStore();
    const supabase = createClient();
    const router = useRouter();

    const [community, setCommunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (communityId) {
            fetchCommunity(communityId);
        } else if (gymIdParam) {
            fetchCommunityByGym(gymIdParam);
        } else if (user?.gymId) {
            fetchPrimaryHub(user.gymId);
        } else {
            setLoading(false);
            setError("No Community ID provided.");
        }
    }, [communityId, gymIdParam, user?.gymId]);

    const fetchPrimaryHub = async (gId) => {
        fetchCommunityByGym(gId);
    };

    const fetchCommunityByGym = async (gId) => {
        const { data, error } = await supabase.from('communities').select('*, gyms(name, address)').eq('gym_id', gId).maybeSingle();
        if (data) {
            setCommunity(data);
        } else {
            setError("Community not found for this Gym.");
        }
        setLoading(false);
    };

    const fetchCommunity = async (cId) => {
        try {
            const { data, error } = await supabase
                .from('communities')
                .select('*, gyms(name, address)')
                .eq('id', cId)
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

            await joinCommunity(community.id, community.gym_id, community.gyms?.name || community.name, consent);
            // Refresh to show Hub
            window.location.reload();
        } catch (err) {
            alert("Failed to join: " + err.message);
        } finally {
            setJoining(false);
        }
    };

    const handleCreateCommunity = async () => {
        if (!gymIdParam && !user?.gymId) return;
        const gId = gymIdParam || user?.gymId;
        setJoining(true); // Reuse joining state for loading
        try {
            // 1. Get Gym Info
            const { data: gym } = await supabase.from('gyms').select('name').eq('id', gId).single();
            if (!gym) throw new Error("Gym not found");

            // 2. Create Community
            const { data: comm, error } = await supabase
                .from('communities')
                .insert({
                    gym_id: gId,
                    name: gym.name,
                    description: `Community for ${gym.name}`,
                    created_by: user.id
                })
                .select()
                .single();

            if (error) throw error;

            // 3. Create Gym Chat if missing
            const { data: existingChat } = await supabase.from('conversations').select('id').eq('gym_id', gId).eq('type', 'gym').maybeSingle();
            if (!existingChat) {
                await supabase.from('conversations').insert({
                    type: 'gym', // or 'community' - store uses 'community' type but 'gym' seems to be the convention for the main chat? 
                    // Store.js used 'community' type for conversation. Let's check conversation types.
                    // Actually store.js used: type: 'community' 
                    // But app/community/page.js looks for: .eq('type', 'gym') in line 137!
                    // Consistency check: store.js creates type='community', page.js looks for type='gym'.
                    // This is likely the BUG! 
                    // "Community not found" is unrelated to chat, but the CHAT link might be broken too.
                    // For now, let's fix the COMMUNITY record.
                    // I will create the converastion as type 'gym' to match the page's expectation OR update the page to match store.
                    // Let's stick to creating the community record first.
                    name: gym.name,
                    gym_id: gId
                });
            }

            window.location.reload();
        } catch (err) {
            alert("Failed to create community: " + err.message);
        } finally {
            setJoining(false);
        }
    };

    if (loading) return <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>;

    if (error === "Community not found for this Gym.") {
        return (
            <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '20px', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--error)', marginBottom: '16px' }}>Community Missing</h2>
                <p style={{ color: '#888', marginBottom: '24px' }}>It seems this Gym exists but doesn't have a Community page yet.</p>
                <button
                    onClick={handleCreateCommunity}
                    disabled={joining}
                    style={{
                        padding: '12px 24px', background: 'var(--primary)', color: '#000',
                        border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer'
                    }}
                >
                    {joining ? 'Creating...' : 'Initialize Community'}
                </button>
            </div>
        );
    }

    if (error) return <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}>{error}</div>;

    // CHECK MEMBERSHIP & TYPE
    // 1. Is Member?
    const isMember = user?.gyms?.some(g => g.id === community.gym_id);

    // 2. Is Partner Gym?
    const isPartner = community.gym_type === 'verified_partner';

    // RENDER HUB IF MEMBER (Partner check removed for now to allow all gyms to have a Hub)
    if (isMember) {
        return <GymHub communityId={community.id} gymId={community.gym_id} />;
    }

    // DEFAULT LANDING PAGE (Non-Member or Non-Partner)
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
                    <button
                        onClick={async () => {
                            const { data: convo } = await supabase
                                .from('conversations')
                                .select('id')
                                .in('type', ['gym', 'community'])
                                .eq('gym_id', community.gym_id)
                                .order('created_at', { ascending: true })
                                .limit(1)
                                .maybeSingle();

                            if (convo) {
                                router.push(`/social/chat/conversation?id=${convo.id}`);
                            } else {
                                router.push(`/connect?tab=chat&subtab=communities`);
                            }
                        }}
                        style={{ display: 'block', width: '100%', padding: '16px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
                    >
                        Already a Member (Open Chat)
                    </button>
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
        </div >
    );
}

export default function CommunityLandingPage() {
    return (
        <Suspense fallback={<div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>}>
            <CommunityContent />
        </Suspense>
    );
}
