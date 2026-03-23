"use client";
import { motion } from 'framer-motion';
import { Dumbbell, Target, Users, Monitor } from 'lucide-react';

export default function TrustBanner() {
    return (
        <section className="border-b border-white/5 bg-[#020202] py-8 overflow-hidden relative flex">
            {/* Gradients to hide edges */}
            <div className="absolute left-0 top-0 bottom-0 w-48 bg-gradient-to-r from-[#020202] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-[#020202] to-transparent z-10 pointer-events-none" />
            
            <div className="flex opacity-30 hover:opacity-100 transition-opacity duration-500 w-full">
                {/* First Marquee - Massive width to guarantee it exceeds any 4K display */}
                <motion.div 
                    initial={{ x: "0%" }}
                    animate={{ x: "-100%" }}
                    transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
                    className="flex shrink-0 gap-24 px-12 items-center whitespace-nowrap"
                >
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Dumbbell className="w-6 h-6 text-zinc-600"/> ELITE POWERLIFTING</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Target className="w-6 h-6 text-zinc-600"/> HYPERTROPHY LABS</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Users className="w-6 h-6 text-zinc-600"/> 10K+ ATHLETES</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Monitor className="w-6 h-6 text-zinc-600"/> 50+ GYMS</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Dumbbell className="w-6 h-6 text-zinc-600"/> PREMIER PERFORMANCE</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Target className="w-6 h-6 text-zinc-600"/> IRON FORGE</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Users className="w-6 h-6 text-zinc-600"/> STRONGMAN COLLECTIVE</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Monitor className="w-6 h-6 text-zinc-600"/> GLOBAL LEADERBOARDS</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Dumbbell className="w-6 h-6 text-zinc-600"/> OLYMPIC WEIGHTLIFTING</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Target className="w-6 h-6 text-zinc-600"/> SQUAD BATTLES</div>
                </motion.div>
                {/* Identical Second Marquee - Follows precisely */}
                <motion.div 
                    initial={{ x: "0%" }}
                    animate={{ x: "-100%" }}
                    transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
                    className="flex shrink-0 gap-24 px-12 items-center whitespace-nowrap"
                >
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Dumbbell className="w-6 h-6 text-zinc-600"/> ELITE POWERLIFTING</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Target className="w-6 h-6 text-zinc-600"/> HYPERTROPHY LABS</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Users className="w-6 h-6 text-zinc-600"/> 10K+ ATHLETES</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Monitor className="w-6 h-6 text-zinc-600"/> 50+ GYMS</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Dumbbell className="w-6 h-6 text-zinc-600"/> PREMIER PERFORMANCE</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Target className="w-6 h-6 text-zinc-600"/> IRON FORGE</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Users className="w-6 h-6 text-zinc-600"/> STRONGMAN COLLECTIVE</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Monitor className="w-6 h-6 text-zinc-600"/> GLOBAL LEADERBOARDS</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Dumbbell className="w-6 h-6 text-zinc-600"/> OLYMPIC WEIGHTLIFTING</div>
                    <div className="flex items-center gap-3 font-extrabold text-xl tracking-widest uppercase text-zinc-500"><Target className="w-6 h-6 text-zinc-600"/> SQUAD BATTLES</div>
                </motion.div>
            </div>
        </section>
    );
}
