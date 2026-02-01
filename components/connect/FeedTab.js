"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function FeedTab() {
    const { user, friends, exercises } = useStore();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchFeed = async () => {
        if (!user || !friends) return;

        setLoading(true);
        try {
            const friendIds = friends.map(f => f.id);
            // Include self in feed? Maybe. Let's include self for now.
            const allIds = [user.id, ...friendIds];

            // If no friends and self (just 1), check if we have workouts
            if (allIds.length === 0) { // Should check user existence first which we did
                setFeed([]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('workouts')
                .select(`
                    *,
                    profile:user_id (name, username, avatar_url, level, xp),
                    likes:workout_likes (user_id),
                    logs:workout_logs (exercise_id, sets)
                `)
                .in('user_id', allIds)
                .not('end_time', 'is', null) // Only finished workouts
                .eq('visibility', 'public') // Respect visibility
                .order('end_time', { ascending: false })
                .limit(20);

            if (error) throw error;

            // Format data
            const formatted = data.map(w => ({
                ...w,
                user: w.profile, // Flatten profile
                likeCount: w.likes ? w.likes.length : 0,
                isLiked: w.likes ? w.likes.some(l => l.user_id === user.id) : false,
                // Summarize workout
                summary: summarizeWorkout(w.logs, exercises)
            }));

            setFeed(formatted);
        } catch (err) {
            console.error("Feed fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchFeed();
    }, [user, friends]);

    const handleLike = async (workoutId, isLiked) => {
        // Optimistic Update
        setFeed(prev => prev.map(w => {
            if (w.id === workoutId) {
                return {
                    ...w,
                    isLiked: !isLiked,
                    likeCount: isLiked ? w.likeCount - 1 : w.likeCount + 1
                };
            }
            return w;
        }));

        try {
            if (isLiked) {
                await supabase.from('workout_likes').delete().match({ workout_id: workoutId, user_id: user.id });
            } else {
                await supabase.from('workout_likes').insert({ workout_id: workoutId, user_id: user.id });
            }
        } catch (err) {
            console.error("Like error:", err);
            // Revert?
        }
    };

    const summarizeWorkout = (logs, exerciseList) => {
        if (!logs || logs.length === 0) return "No exercises recorded.";

        // Count total sets and PRs (if we had PR data attached)
        const exerciseNames = logs.map(l => {
            const ex = exerciseList.find(e => e.id === l.exercise_id);
            return ex ? ex.name : 'Unknown Exercise';
        });

        // Unique names
        const unique = [...new Set(exerciseNames)];
        if (unique.length > 3) {
            return `${unique.slice(0, 3).join(', ')} + ${unique.length - 3} more`;
        }
        return unique.join(', ');
    };

    if (!user) return <div className="p-4">Loading...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Find Friends CTA if empty */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading updates...</div>
            ) : feed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🌍</div>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Your Feed is Empty</p>
                    <p style={{ marginBottom: '16px' }}>Add friends to see their workouts here!</p>
                    <Link href="/social/add" style={{
                        background: 'var(--primary)',
                        color: 'black',
                        padding: '12px 24px',
                        borderRadius: '100px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        display: 'inline-block'
                    }}>
                        Find Friends
                    </Link>
                </div>
            ) : (
                feed.map(post => (
                    <div key={post.id} style={{
                        background: 'var(--surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-light)' }}>
                            <img
                                src={post.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{post.user?.name || 'Unknown'}
                                    {post.user?.level && <span style={{ fontSize: '0.7rem', background: 'var(--surface-highlight)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', color: 'var(--primary)' }}>Lvl {post.user.level}</span>}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {formatDistanceToNow(new Date(post.end_time))} ago
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '16px' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{post.name || 'Workout'}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
                                {post.summary}
                            </p>

                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <div>⏱️ {Math.round(post.duration / 60)} min</div>
                                <div>⚖️ {(post.volume / 1000).toFixed(1)}k kg</div>
                                {/* XP Badge? */}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '16px' }}>
                            <button
                                onClick={() => handleLike(post.id, post.isLiked)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: post.isLiked ? 'var(--primary)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontWeight: '600'
                                }}
                            >
                                {post.isLiked ? '❤️' : '🤍'} {post.likeCount || 0} Push
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
