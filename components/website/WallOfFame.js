"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function WallOfFame() {
    const [reviews, setReviews] = useState([
        { quote: "Die Mastery-Phase ist ein Game-Changer. Ich habe aufgehört Ego-Lifts zu machen und mein Bankdrücken endlich sauber um 15kg gesteigert.", name: "Julian W.", role: "Powerlifter", delay: 0 },
        { quote: "Die Live-Leaderboards im Gym haben unser komplettes Floor-Ambiente verändert. Die Leute pushen sich gegenseitig wie nie zuvor.", name: "Sarah M.", role: "Studiobesitzer", delay: 0.1 },
        { quote: "Ich tracke seit 4 Jahren, aber kein Algorithmus war so präzise darin, mein Volumen auf Basis meiner Tagesform (RPE) anzupassen.", name: "Dennis K.", role: "Bodybuilder", delay: 0.2 },
    ]);

    useEffect(() => {
        const fetchReviews = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('reviews')
                .select('*')
                .eq('approved', true)
                .order('created_at', { ascending: false })
                .limit(3);
                
            if (data && data.length > 0) {
                setReviews(data.map((r, i) => ({
                    quote: r.comment,
                    name: r.name,
                    role: r.role || 'Athlet',
                    rating: r.rating || 5,
                    delay: i * 0.1
                })));
            }
        };
        fetchReviews();
    }, []);

    return (
        <section className="py-24 px-6 lg:px-16 max-w-7xl mx-auto border-t border-white/5 relative z-10">
            <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-brand/5 blur-[120px] rounded-full pointer-events-none z-0" />
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mb-16 text-center relative z-10"
            >
                <h3 className="text-brand text-sm font-black tracking-[0.2em] uppercase mb-4 flex items-center justify-center gap-3">
                    <Star className="w-4 h-4 fill-brand text-brand" /> Wall of Fame
                </h3>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
                    WAS TOP-ATHLETEN SAGEN.
                </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 relative z-10">
                {reviews.map((review, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: review.delay }}
                        className="bg-[#050505] border border-white/5 rounded-3xl p-8 hover:bg-[#0a0a0a] hover:border-white/10 transition-all duration-300 group shadow-xl flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex gap-1 mb-6">
                                {[...Array(review.rating || 5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-brand text-brand drop-shadow-[0_0_8px_rgba(250,255,0,0.5)]" />)}
                            </div>
                            <p className="text-zinc-300 font-light leading-relaxed mb-8 italic text-lg">
                                "{review.quote}"
                            </p>
                        </div>
                        <div className="flex items-center gap-4 border-t border-white/5 pt-6">
                            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center font-bold text-zinc-500 shadow-inner group-hover:bg-zinc-800 transition-colors">
                                {review.name.charAt(0)}
                            </div>
                            <div>
                                <h5 className="text-white font-bold text-sm tracking-wide">{review.name}</h5>
                                <span className="text-brand/80 text-xs uppercase tracking-wider font-semibold">{review.role}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
