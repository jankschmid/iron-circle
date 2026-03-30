"use client";
import { motion } from 'framer-motion';
import { LineChart, Lock, Users } from 'lucide-react';
import { PhoneMockup, MockupSlideshow } from './Mockups';

export default function BentoB2C() {
    return (
        <section id="b2c" className="py-32 px-6 lg:px-16 max-w-7xl mx-auto border-b border-white/5">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mb-16"
            >
                <h3 className="text-brand text-sm font-black tracking-[0.2em] uppercase mb-4 flex items-center gap-3">
                    <div className="w-2 h-2 bg-brand rounded-full animate-pulse shadow-[0_0_10px_rgba(250,255,0,1)]" /> 
                    B2C (Athleten)
                </h3>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
                    PRÄZISION & PROGRESSION. <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 to-zinc-600">Der ultimative Tracker.</span>
                </h2>
            </motion.div>

            {/* Bento Grid */}
            <div className="grid lg:grid-cols-3 gap-6 auto-rows-[400px] lg:auto-rows-[340px]">
                
                {/* Large Left Card -> col-span-1 row-span-2 */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-1 lg:row-span-2 bg-[#050505] border border-white/5 hover:border-brand/40 rounded-[2rem] p-8 pb-0 flex flex-col hover:bg-[#0a0a0a] transition-all duration-500 group shadow-[0_0_15px_rgba(250,255,0,0.02)] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[80px] rounded-full pointer-events-none" />
                    <div className="relative z-10 mb-8">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-brand shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <LineChart className="w-6 h-6" />
                            </div>
                            <h4 className="text-2xl text-white font-bold tracking-tight">Smarte Progression</h4>
                        </div>
                        <p className="text-zinc-400 leading-relaxed font-light">
                            Die Engine lernt deine Limits und berechnet die perfekte Steigerung auf Basis deiner Tagesform (RIR & RPE).
                        </p>
                    </div>
                    
                    {/* Phone sliding in from bottom */}
                    <div className="relative z-10 flex-1 mt-auto flex justify-center items-end">
                        <div className="absolute inset-x-0 bottom-[-10%] group-hover:bottom-[0%] transition-all duration-700 ease-out flex justify-center drop-shadow-2xl">
                            <PhoneMockup size="md" mockupIndex={1} className="sm:scale-95 origin-bottom" />
                        </div>
                    </div>
                </motion.div>

                {/* Top-Right Card -> col-span-2 row-span-1 */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 lg:row-span-1 bg-[#050505] border border-white/5 hover:border-brand/40 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 hover:bg-[#0a0a0a] transition-all duration-500 group shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand/5 blur-[80px] rounded-full pointer-events-none" />
                    <div className="relative z-10 md:w-1/2">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-brand shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h4 className="text-2xl text-white font-bold tracking-tight">Mastery Phase</h4>
                        </div>
                        <p className="text-zinc-400 leading-relaxed font-light">
                            Forces you to master a weight souverän (RIR 2) before we progress. Ego lifting ist Geschichte.
                        </p>
                    </div>
                    
                    {/* Phone peeking from right side */}
                    <div className="relative z-10 md:w-1/2 h-full flex items-center justify-end">
                        <div className="translate-x-[10%] translate-y-[30%] group-hover:translate-x-[0%] group-hover:translate-y-[20%] transition-all duration-700 ease-out rotate-[-5deg] group-hover:rotate-0">
                            <PhoneMockup size="md" mockupIndex={2} />
                        </div>
                    </div>
                </motion.div>

                {/* Bottom-Right Card -> col-span-2 row-span-1 */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 lg:row-span-1 bg-gradient-to-br from-[#0a0a0a] to-[#000000] border border-white/5 hover:border-brand/40 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 hover:bg-[#080808] transition-all duration-500 group shadow-[0_0_30px_rgba(250,255,0,0.02)] hover:shadow-[0_0_40px_rgba(250,255,0,0.1)] relative overflow-hidden"
                >
                    {/* Glow */}
                    <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-brand/10 blur-[80px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative z-10 md:w-1/2">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shadow-inner group-hover:scale-110 group-hover:bg-brand/20 transition-all duration-500">
                                <Users className="w-6 h-6" />
                            </div>
                            <h4 className="text-2xl text-white font-bold tracking-tight">Squad Challenges</h4>
                        </div>
                        <p className="text-zinc-400 leading-relaxed font-light">
                            Tritt offenen Teams bei oder gründe deinen eigenen Squad für epische Leaderboards und interne Rivalitäten.
                        </p>
                    </div>
                    
                    {/* Phone sliding up from bottom right */}
                    <div className="relative z-10 md:w-1/2 h-full flex justify-end items-end overflow-hidden pt-10">
                        <div className="translate-y-[40%] group-hover:translate-y-[20%] transition-all duration-700 ease-out rotate-[5deg] group-hover:rotate-0">
                            <PhoneMockup size="md" className="scale-90" mockupIndex={3} />
                        </div>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
