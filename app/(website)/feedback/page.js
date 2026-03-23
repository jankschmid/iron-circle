"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, Send, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function AppFeedbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [user, setUser] = useState(null);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [formData, setFormData] = useState({ 
        name: '', 
        role: 'Athlete', 
        rating: 5, 
        comment: '' 
    });

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                
                // 1. Check if they already reviewed
                const { data: existingReview } = await supabase
                    .from('reviews')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .single();
                    
                if (existingReview) {
                    setHasReviewed(true);
                    return; // Stop loading form
                }

                // 2. Pre-fill name if profile exists
                const { data } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
                if (data?.username) {
                    setFormData(prev => ({ ...prev, name: data.username }));
                }
            }
        };
        fetchUser();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            router.push('/login');
            return;
        }
        
        setStatus('loading');
        const supabase = createClient();
        
        // Insert Review
        const { error: reviewError } = await supabase
            .from('reviews')
            .insert([{
                user_id: user.id,
                name: formData.name,
                role: formData.role,
                rating: formData.rating,
                comment: formData.comment
            }]);

        if (reviewError) {
            console.error("Error submitting review:", reviewError);
            setStatus('error');
            return;
        }

        // Award 20,000 XP
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('lifetime_xp, cycle_xp')
                .eq('id', user.id)
                .single();
                
            const oldCycle = Number(profile?.cycle_xp || 0);
            const oldLifetime = Number(profile?.lifetime_xp || 0);
            
            await supabase.from('profiles').update({
                cycle_xp: oldCycle + 20000,
                lifetime_xp: oldLifetime + 20000
            }).eq('id', user.id);
            
        } catch (e) {
            console.error("Failed to add XP", e);
        }

        setStatus('success');
    };

    return (
        <div className="min-h-screen bg-[#020202] text-zinc-200 font-sans selection:bg-brand/30 selection:text-brand flex flex-col">
            <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <img src="/assets/logo/Iron-Circle_Logo_Two_Color.svg" alt="IronCircle Logo" className="w-8 h-8" />
                    <span className="text-xl font-extrabold tracking-tight text-white hidden sm:block">ironCircle</span>
                </div>
                <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
            </header>

            <main className="flex-1 flex items-center justify-center p-6 py-20 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 blur-[150px] rounded-full pointer-events-none z-0" />
                
                <div className="w-full max-w-2xl relative z-10">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-brand/10 border border-brand/20 text-brand mb-6 shadow-[0_0_20px_rgba(250,255,0,0.15)] gap-2">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">+20.000 XP REWARD</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Leave a Review</h1>
                        <p className="text-zinc-400 text-lg font-light">Erzähle der Welt deine Story und werde zur Legende auf der Wall of Fame.</p>
                    </div>

                    <div className="bg-[#050505] border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                        {!user ? (
                            <div className="text-center py-12">
                                <h3 className="text-2xl font-bold text-white mb-4">Login Required</h3>
                                <p className="text-zinc-400 mb-8">Du musst eingeloggt sein, um bewerten zu können und 20.000 XP zu kassieren.</p>
                                <Link href="/login" className="px-8 py-3 bg-brand text-black font-bold rounded-xl hover:bg-brand-dark transition-colors inline-block">
                                    Jetzt Einloggen
                                </Link>
                            </div>
                        ) : hasReviewed ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                    <ShieldCheck className="w-10 h-10 text-brand opacity-50" />
                                </div>
                                <h3 className="text-3xl font-black text-white mb-4">Review bereits abgegeben</h3>
                                <p className="text-zinc-400 font-light mb-8 max-w-sm">
                                    Du hast bereits ein Feedback hinterlassen. Danke, dass du IronCircle treu bist!
                                </p>
                                <button onClick={() => router.push('/profile')} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors border border-white/10">
                                    Zurück zum Profil
                                </button>
                            </div>
                        ) : status === 'success' ? (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 bg-brand/30 blur-[40px] rounded-full animate-pulse" />
                                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand to-yellow-500 flex items-center justify-center shadow-[0_0_50px_rgba(250,255,0,0.6)] relative z-10 border-[6px] border-[#020202]">
                                        <Trophy className="w-14 h-14 text-black" />
                                    </div>
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black text-brand text-[10px] font-black px-4 py-1.5 rounded-full border border-brand uppercase tracking-widest whitespace-nowrap z-20 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                                        Achievement Unlocked
                                    </div>
                                </div>
                                
                                <h3 className="text-4xl font-black text-white mb-2 tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                    +20,000 XP EARNED
                                </h3>
                                <p className="text-brand font-bold text-lg mb-6 tracking-wide">PIONEER OF THE WALL</p>
                                
                                <p className="text-zinc-400 font-light mb-8 max-w-xs mx-auto text-sm leading-relaxed">
                                    Dein Feedback treibt IronCircle an. Dein Review wurde erfolgreich eingereicht!
                                </p>
                                <button onClick={() => router.push('/profile')} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors border border-white/10 hover:border-white/20">
                                    XP im Profil ansehen
                                </button>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                                <div className="space-y-3 text-center">
                                    <label className="text-sm font-semibold text-zinc-400 uppercase tracking-widest block">Deine Bewertung</label>
                                    <div className="flex items-center justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button 
                                                key={star} 
                                                type="button"
                                                onClick={() => setFormData({...formData, rating: star})}
                                                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                            >
                                                <Star className={`w-12 h-12 transition-colors ${formData.rating >= star ? 'fill-brand text-brand drop-shadow-[0_0_15px_rgba(250,255,0,0.4)]' : 'text-zinc-800'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">Name (Öffentlich)</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            className="w-full px-5 py-4 bg-black border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-medium"
                                            placeholder="Dein Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">Rolle / Gym</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.role}
                                            onChange={e => setFormData({...formData, role: e.target.value})}
                                            className="w-full px-5 py-4 bg-black border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-medium"
                                            placeholder="z.B. Powerlifter, Gym Owner"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">Dein Erfahrungsbericht</label>
                                    <textarea 
                                        required
                                        rows={4}
                                        value={formData.comment}
                                        onChange={e => setFormData({...formData, comment: e.target.value})}
                                        className="w-full px-5 py-4 bg-black border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-medium resize-none"
                                        placeholder="Was ist dein Eindruck von IronCircle?"
                                    />
                                </div>

                                {status === 'error' && (
                                    <p className="text-red-400 text-sm text-center bg-red-400/10 py-3 rounded-lg border border-red-400/20">
                                        Fehler beim Speichern. Bitte lade die Seite neu und probiere es nochmal.
                                    </p>
                                )}

                                <button 
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full relative flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-brand to-brand-dark text-black font-extrabold text-lg rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(250,255,0,0.2)] hover:shadow-[0_0_40px_rgba(250,255,0,0.4)] hover:-translate-y-1 overflow-hidden disabled:opacity-70 disabled:pointer-events-none group"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
                                    <span className="relative z-10 flex items-center gap-2">
                                        {status === 'loading' ? 'Wird gespeichert...' : 'Review absenden & 20.000 XP kassieren'}
                                        {status !== 'loading' && <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                    </span>
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
