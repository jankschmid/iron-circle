import { motion } from 'framer-motion';
import { Trophy, Zap, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { MockupSlideshow } from './Mockups';
import SmartDownloadButton from './SmartDownloadButton';

export default function Hero({ yHeroText, opacityHeroText, yFloating1, yFloating2 }) {
    return (
        <section className="relative min-h-[85vh] flex items-center overflow-hidden border-b border-white/5 bg-[#020202]">
            {/* Absolute Full-Bleed Background Image */}
            <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                <motion.img 
                    initial={{ scale: 1.08, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.35 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop" 
                    className="absolute inset-0 w-full h-full object-cover object-[center_right] md:object-right grayscale mix-blend-luminosity" 
                    alt="Strength training gym background" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#020202] via-[#020202]/95 to-transparent w-full lg:w-3/4 z-10" />
                <div className="absolute inset-y-0 left-0 w-[10%] lg:w-1/4 bg-[#020202] z-10" /> 
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#020202] via-[#020202]/40 to-transparent h-64 z-10" />
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#020202] via-[#020202]/20 to-transparent h-48 z-10" />
            </div>

            {/* Content Container */}
            <div className="w-full relative z-20 flex flex-col lg:flex-row px-8 lg:px-16 py-12 mx-auto max-w-[1400px] gap-12 lg:gap-0 mt-8 lg:mt-0">
                
                {/* Left: Text Content */}
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
                        className="text-5xl lg:text-[5.5rem] font-extrabold text-white leading-[1.05] mb-6 tracking-tight drop-shadow-sm"
                    >
                        Level Up Dein Training.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-dark block mt-2 drop-shadow-[0_0_25px_rgba(250,255,0,0.3)]">Stärke Dein Studio.</span>
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                        className="text-lg lg:text-xl text-zinc-400 max-w-lg mb-12 leading-relaxed font-light"
                    >
                        Der ultimative smarte Progression-Tracker für Athleten, eingebettet in ein Gamification-Ökosystem für Studios, um Mitglieder langfristig zu binden.
                    </motion.p>
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row gap-5"
                    >
                        <Link href="/login" className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 text-white text-center font-bold text-lg rounded-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-md overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
                            <span className="relative z-10 flex items-center gap-2">Als Athlet beitreten <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                        </Link>
                        <SmartDownloadButton variant="secondary" />
                        <a href="#b2b" className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 text-white text-center font-bold text-lg rounded-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-md">
                            Studio Demo
                        </a>
                    </motion.div>
                </motion.div>

                {/* Right: Phone Showcase */}
                <div className="w-full lg:w-2/5 flex items-center justify-center relative">
                    {/* Floating Parallax Wrapper */}
                    <div className="relative">
                        {/* Parallax Elements */}
                        <motion.div 
                            style={{ y: yFloating1 }}
                            className="absolute -top-12 -left-20 z-30 hidden md:flex items-center justify-center drop-shadow-[0_0_25px_rgba(250,255,0,0.3)]"
                            animate={{ y: [0, -15, 0] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                        >
                            <Trophy className="w-20 h-20 text-brand" />
                        </motion.div>
                        
                        <motion.div 
                            style={{ y: yFloating2 }}
                            className="absolute -bottom-12 -right-16 z-30 hidden md:flex items-center justify-center drop-shadow-[0_0_25px_rgba(250,255,0,0.3)]"
                            animate={{ y: [0, 10, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
                        >
                            <Zap className="w-16 h-16 text-brand" />
                        </motion.div>

                        {/* The Phone */}
                        <motion.div
                            initial={{ opacity: 0, x: 50, rotate: 5 }}
                            animate={{ opacity: 1, x: 0, rotate: -2 }}
                            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                            className="relative z-20"
                        >
                            <div className="absolute inset-0 bg-brand/10 blur-[100px] rounded-full -m-12 animate-pulse" />
                            <MockupSlideshow size="lg" className="shadow-[0_40px_100px_rgba(0,0,0,0.8)]" />
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
