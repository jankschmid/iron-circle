"use client";
import { motion } from 'framer-motion';
import { Monitor, Brain, BarChart3, ArrowRight } from 'lucide-react';
import { TVMockup } from './Mockups';

export default function DashboardB2B() {
    return (
        <section id="b2b" className="py-32 px-6 lg:px-16 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mb-16 text-right flex flex-col items-end"
            >
                <h3 className="text-zinc-500 text-sm font-black tracking-[0.2em] uppercase mb-4 flex items-center justify-end gap-3">
                    Facility (B2B)
                    <div className="w-2 h-2 bg-zinc-600 rounded-full" /> 
                </h3>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
                    GYM OPERATING SYSTEM. <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-l from-brand to-brand-dark">Gamify Your Floor.</span>
                </h2>
            </motion.div>

            <div className="flex flex-col gap-6">
                
                {/* Huge Top Card -> TV Mockup */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="bg-[#050505] border border-white/5 hover:border-brand/30 rounded-[2rem] p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-12 hover:bg-[#0a0a0a] transition-all duration-500 group shadow-2xl relative overflow-hidden"
                >
                    {/* Ambient Glow */}
                    <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-brand/5 blur-[120px] rounded-full pointer-events-none" />
                    
                    <div className="relative z-10 lg:w-1/3 flex flex-col justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-brand shadow-inner mb-6 group-hover:scale-110 transition-transform duration-500">
                            <Monitor className="w-8 h-8" />
                        </div>
                        <h4 className="text-3xl text-white font-extrabold tracking-tight mb-4">Live TV Leaderboards</h4>
                        <p className="text-lg text-zinc-400 font-light leading-relaxed mb-8">
                            Stream workouts live onto your gym televisions. Build an instant, hyper-connected community on the gym floor und motiviere deine Mitglieder visuell.
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-zinc-300 font-medium">
                                <div className="w-5 h-5 rounded-full border border-brand/50 flex items-center justify-center"><ArrowRight className="w-3 h-3 text-brand"/></div>
                                Real-Time Rankings
                            </li>
                            <li className="flex items-center gap-3 text-zinc-300 font-medium">
                                <div className="w-5 h-5 rounded-full border border-brand/50 flex items-center justify-center"><ArrowRight className="w-3 h-3 text-brand"/></div>
                                Squad Battles via Screen
                            </li>
                        </ul>
                    </div>
                    
                    <div className="relative z-10 lg:w-2/3 h-full flex justify-center items-center">
                        <div className="group-hover:scale-105 transition-transform duration-700 ease-out shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-xl w-full">
                            <TVMockup />
                        </div>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Bottom-Left Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-[#050505] border border-white/5 hover:border-purple-500/30 rounded-[2rem] p-8 flex flex-col justify-between hover:bg-[#0a0a0a] transition-all duration-500 group shadow-2xl relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-500 shadow-inner">
                                    <Brain className="w-6 h-6" />
                                </div>
                                <h4 className="text-2xl text-white font-bold tracking-tight">Predictive Churn Radar</h4>
                            </div>
                            <p className="text-zinc-400 font-light leading-relaxed mb-6">
                                Our algorithm flags members at risk of canceling <span className="text-white font-semibold">weeks</span> before they quit. Engage them instantly via push notifications.
                            </p>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-900 border border-white/5 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500/20 to-purple-500 w-3/4 animate-pulse" />
                        </div>
                    </motion.div>

                    {/* Bottom-Right Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="bg-[#050505] border border-white/5 hover:border-brand/30 rounded-[2rem] p-8 flex flex-col justify-between hover:bg-[#0a0a0a] transition-all duration-500 group shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-[50px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-brand group-hover:scale-110 transition-transform duration-500 shadow-inner">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                                <h4 className="text-2xl text-white font-bold tracking-tight">Central Analytics</h4>
                            </div>
                            <p className="text-zinc-400 font-light leading-relaxed">
                                Detaillierte Statistiken über Stoßzeiten, demografische Verteilungen und Gerät-Beliebtheit deines Gyms, inklusive Export.
                            </p>
                        </div>
                        
                        <div className="flex items-end gap-2 mt-8 h-16 w-full">
                            {[30, 50, 40, 70, 90, 60, 100].map((h, i) => (
                                <div key={i} className="flex-1 bg-zinc-800 rounded-t-sm group-hover:bg-gradient-to-t group-hover:from-brand-dark group-hover:to-brand transition-all duration-500" style={{ height: `${h}%`, transitionDelay: `${i * 50}ms` }} />
                            ))}
                        </div>
                    </motion.div>

                </div>

            </div>
        </section>
    );
}
