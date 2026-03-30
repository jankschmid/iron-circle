"use client";
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import Link from 'next/link';

export default function Pricing() {
    return (
        <section className="py-24 px-6 lg:px-16 max-w-7xl mx-auto border-t border-white/5 relative z-10" id="pricing">
            <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-brand/5 blur-[120px] rounded-full pointer-events-none z-0" />
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mb-16 text-center relative z-10"
            >
                <h3 className="text-brand text-sm font-black tracking-[0.2em] uppercase mb-4 flex items-center justify-center gap-3">
                    <Lock className="w-4 h-4" /> Transparentes Pricing
                </h3>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
                    WÄHLE DEIN LEVEL.
                </h2>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8 relative z-10 lg:items-stretch">
                {/* Tier 1: Free */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                    className="bg-[#050505] border border-white/5 rounded-3xl p-8 hover:bg-[#0a0a0a] transition-colors flex flex-col"
                >
                    <h4 className="text-xl text-white font-bold mb-2">Free Athlete</h4>
                    <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-4xl font-black text-white">€0</span>
                        <span className="text-zinc-500 font-medium">/ Monat</span>
                    </div>
                    <p className="text-zinc-400 font-light text-sm mb-8">Für den Einstieg in smarte Progression.</p>
                    <ul className="space-y-4 mb-8 flex-1">
                        {[
                            "Workouts loggen (RPE & RIR)",
                            "Zugriff auf dein Gym Leaderboard",
                            "Basis Statistiken",
                            "Standard Algorithmus"
                        ].map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-zinc-300 text-sm">
                                <div className="mt-0.5 w-5 h-5 rounded-full bg-white/5 flex flex-shrink-0 items-center justify-center text-brand">✓</div>
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                    <Link href="/login" className="mt-auto w-full text-center py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors">Kostenlos starten</Link>
                </motion.div>

                {/* Tier 2: Advanced (Middle) */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                    className="bg-[#050505] border border-white/10 hover:border-brand/30 rounded-3xl p-8 transition-colors flex flex-col group"
                >
                    <h4 className="text-xl text-white font-bold mb-2">Advanced Athlete</h4>
                    <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-4xl font-black text-white">€1.99</span>
                        <span className="text-zinc-500 font-medium">/ Monat</span>
                    </div>
                    <p className="text-zinc-400 font-light text-sm mb-8">Mehr Insights für dein Hypertrophie-Training.</p>
                    <ul className="space-y-4 mb-8 flex-1">
                        {[
                            "Alles aus Free",
                            "Erweiterte Muscle-Heatmap",
                            "Advanced Analytics Dashboard",
                            "Unlimitierte Custom Exercises",
                            "Premium Priority Support"
                        ].map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-zinc-200 text-sm">
                                <div className="mt-0.5 w-5 h-5 rounded-full bg-white/10 group-hover:bg-brand/20 flex flex-shrink-0 items-center justify-center text-brand transition-colors">✓</div>
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                    <Link href="/login" className="mt-auto w-full text-center py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors">Advanced Wählen</Link>
                </motion.div>

                {/* Tier 3: Pro Elite (Highlight) */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
                    className="bg-[#050505] border border-brand/40 shadow-[0_0_30px_rgba(250,255,0,0.1)] rounded-3xl p-8 lg:p-10 relative overflow-hidden group flex flex-col transform lg:-translate-y-4"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[80px] rounded-full pointer-events-none" />
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand to-brand-dark" />
                    
                    <h4 className="text-xl text-white font-bold mb-2 flex items-center justify-between">
                        Pro Athlete
                        <span className="text-[10px] uppercase tracking-widest bg-brand/10 text-brand px-2 py-1 rounded-md font-bold">Beliebt</span>
                    </h4>
                    <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-5xl font-black text-white">€3.99</span>
                        <span className="text-zinc-500 font-medium">/ Monat</span>
                    </div>
                    <p className="text-zinc-400 font-light text-sm mb-8">Entfessle den vollen Predictive Overload.</p>
                    <ul className="space-y-4 mb-8 flex-1">
                        {[
                            "Alles aus Advanced",
                            "Predictive Overload AI Algorithmus",
                            "Mastery Phase & Plateaubreaker",
                            "Echte 1RM Vorhersage AI",
                            "Premium Profile Badge 👑"
                        ].map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-white text-sm font-medium">
                                <div className="mt-0.5 w-5 h-5 rounded-full bg-brand/20 flex flex-shrink-0 items-center justify-center text-brand">✓</div>
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                    <Link href="/login" className="mt-auto w-full text-center py-4 bg-gradient-to-r from-brand to-brand-dark text-black font-extrabold rounded-xl hover:shadow-[0_0_15px_rgba(250,255,0,0.3)] hover:-translate-y-1 transition-all duration-300">Auf Pro upgraden</Link>
                </motion.div>
            </div>

            {/* B2B Gym Partner Banner */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
                className="mt-16 sm:mt-24 lg:mt-32 max-w-5xl mx-auto bg-[#030303] border border-white/5 hover:border-white/10 rounded-[2.5rem] p-8 lg:p-12 relative overflow-hidden group shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent pointer-events-none opacity-50" />
                <div className="relative z-10 flex-1 text-center lg:text-left">
                    <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">Bist du ein Gym Owner?</h3>
                    <p className="text-zinc-400 font-light text-lg max-w-2xl leading-relaxed">
                        Verwandle dein Studio in eine Elite-Facility. Mit Live TV-Leaderboards, AI Churn Radar und Custom Challenges baust du eine unvergleichliche Community-Experience auf.
                    </p>
                </div>
                <div className="relative z-10 flex-shrink-0 w-full lg:w-auto">
                    <Link href="/contact" className="block w-full lg:w-max px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10 shadow-lg whitespace-nowrap">
                        Partner Programm anfragen
                    </Link>
                </div>
            </motion.div>
        </section>
    );
}
