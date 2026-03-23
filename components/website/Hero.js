"use client";
import { motion } from 'framer-motion';
import { Trophy, Zap, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Hero({ yHeroText, opacityHeroText, yFloating1, yFloating2 }) {
    return (
        <section className="relative min-h-[70vh] lg:min-h-[80vh] flex items-center overflow-hidden border-b border-white/5 bg-[#020202]">
            {/* Absolute Full-Bleed Background Image */}
            <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                <motion.img 
                    initial={{ scale: 1.08, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.4 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop" 
                    className="absolute inset-0 w-full h-full object-cover object-[center_right] md:object-right grayscale mix-blend-luminosity" 
                    alt="Strength training gym background" 
                />
                {/* Massive gradient fading from solid black on left to transparent right */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#020202] via-[#020202]/90 to-transparent w-full lg:w-3/4 z-10" />
                {/* Solid block on the far left to guarantee zero seam */}
                <div className="absolute inset-y-0 left-0 w-[10%] lg:w-1/4 bg-[#020202] z-10" /> 
                
                {/* Top and Bottom Fades */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#020202] via-[#020202]/40 to-transparent h-64 z-10" />
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#020202] via-[#020202]/20 to-transparent h-48 z-10" />
            </div>

            {/* Parallax Floating Elements */}
            <motion.div 
                style={{ y: yFloating1 }}
                className="absolute top-1/4 right-[15%] lg:right-[25%] z-20 hidden md:flex items-center justify-center drop-shadow-[0_0_20px_rgba(250,255,0,0.4)]"
                animate={{ y: [0, -15, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            >
                <Trophy className="w-16 h-16 text-brand" />
            </motion.div>
            
            <motion.div 
                style={{ y: yFloating2 }}
                className="absolute bottom-1/3 right-[5%] lg:right-[10%] z-20 hidden md:flex items-center justify-center drop-shadow-[0_0_20px_rgba(250,255,0,0.4)]"
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
            >
                <Zap className="w-12 h-12 text-brand" />
            </motion.div>

            {/* Left-aligned Content */}
            <div className="w-full relative z-20 flex px-8 lg:px-16 py-12 mx-auto max-w-[1400px]">
                <motion.div 
                    style={{ y: yHeroText, opacity: opacityHeroText }}
                    className="flex flex-col justify-center w-full lg:w-3/5"
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand text-xs font-bold uppercase tracking-widest w-max mb-8 shadow-[0_0_15px_rgba(250,255,0,0.15)]"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Next-Gen Progression
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="text-5xl lg:text-[5.5rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-600 leading-[1.05] mb-6 tracking-tight drop-shadow-sm"
                    >
                        Level Up Your Training.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-dark block mt-2 drop-shadow-[0_0_25px_rgba(250,255,0,0.3)]">Empower Your Gym.</span>
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                        className="text-lg lg:text-xl text-zinc-400 max-w-lg mb-12 leading-relaxed font-light"
                    >
                        The ultimate smart progression tracker for athletes to achieve mastery, wrapped in a gamification ecosystem for gyms to destroy churn.
                    </motion.p>
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row gap-5"
                    >
                        <Link href="/login" className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-brand to-brand-dark text-black font-extrabold text-lg rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(250,255,0,0.3)] hover:shadow-[0_0_40px_rgba(250,255,0,0.5)] hover:-translate-y-1 overflow-hidden pointer-events-auto">
                            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
                            <span className="relative z-10 flex items-center gap-2">Join as Athlete <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                        </Link>
                        <a href="#b2b" className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 text-white text-center font-bold text-lg rounded-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-md">
                            Gym Demo
                        </a>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
