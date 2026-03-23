"use client";
import { motion } from 'framer-motion';
import { Sparkles, UserPlus, Target, Trophy } from 'lucide-react';

export default function HowItWorks() {
    return (
        <section className="py-32 px-6 lg:px-16 max-w-7xl mx-auto border-t border-white/5 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand/5 blur-[150px] rounded-full pointer-events-none z-0" />
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mb-20 text-center relative z-10"
            >
                <h3 className="text-brand text-sm font-black tracking-[0.2em] uppercase mb-4 flex items-center justify-center gap-3">
                    <Sparkles className="w-4 h-4" /> Der Weg zur Elite
                </h3>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
                    IN <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 to-zinc-600">DREI SCHRITTEN</span> ZUR MASTERY.
                </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
                {/* Connecting Line (Desktop only) */}
                <div className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent -z-10" />

                {[
                    { step: "01", title: "Gym Connect", desc: "Wähle dein lokales Gym aus oder trainiere global. Verbinde dich mit der Community.", icon: UserPlus },
                    { step: "02", title: "Smart Tracking", desc: "Logge Gewicht, RPE & RIR. Unser Algorithmus diktiert den perfekten Progressive Overload.", icon: Target },
                    { step: "03", title: "Rank Up", desc: "Zerstöre Plateaus, klettere in den lokalen Leaderboards und miss dich mit Athleten.", icon: Trophy }
                ].map((item, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.2 }}
                        className="bg-[#050505] border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center hover:bg-[#0a0a0a] transition-colors relative group shadow-xl"
                    >
                        <div className="absolute -top-5 w-10 h-10 bg-[#020202] border border-white/10 rounded-full flex items-center justify-center font-black text-brand text-sm shadow-[0_0_15px_rgba(250,255,0,0.1)]">
                            {item.step}
                        </div>
                        <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-brand mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner">
                            <item.icon className="w-10 h-10" />
                        </div>
                        <h4 className="text-2xl text-white font-bold mb-4 tracking-tight">{item.title}</h4>
                        <p className="text-zinc-400 font-light leading-relaxed">{item.desc}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
