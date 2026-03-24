"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WORKOUT_PLANS } from '@/lib/muscleEngine/muscleMapper';

// Inline SVG rendering to bypass CORS issues with <object> tag in Next.js
function MuscleMapInline({ activeMuscles, view }) {
    const [svgContent, setSvgContent] = useState('');

    const INACTIVE    = '#757575';
    const NON_MUSCLE  = '#434343';
    const MID_COLOR   = '#d97706';
    const ACTIVE      = '#faff00';

    const lerpHex = (from, to, t) => {
        const parse = (hex, i) => parseInt(hex.slice(i, i+2), 16);
        const r = c => Math.round(c).toString(16).padStart(2,'0');
        return `#${r(parse(from,1)+(parse(to,1)-parse(from,1))*t)}${r(parse(from,3)+(parse(to,3)-parse(from,3))*t)}${r(parse(from,5)+(parse(to,5)-parse(from,5))*t)}`;
    };

    const getColor = (intensity) => {
        if (intensity <= 0) return INACTIVE;
        if (intensity < 0.5) return lerpHex(INACTIVE, MID_COLOR, intensity * 2);
        return lerpHex(MID_COLOR, ACTIVE, (intensity - 0.5) * 2);
    };

    useEffect(() => {
        const svgPath = view === 'front'
            ? '/assets/muscles/muscles_front.svg'
            : '/assets/muscles/muscles_rear.svg';

        fetch(svgPath)
            .then(r => r.text())
            .then(text => setSvgContent(text));
    }, [view]);

    // Inject colors by replacing style attributes in raw SVG text
    const styledSvg = useCallback(() => {
        if (!svgContent) return '';
        
        let result = svgContent;
        
        // Replace fill colors for each active muscle
        for (const [id, intensity] of Object.entries(activeMuscles)) {
            const color = getColor(intensity);
            const isMaxed = intensity >= 1.0;
            const filterStyle = isMaxed 
                ? `fill:${color};filter:drop-shadow(0 0 6px ${ACTIVE});` 
                : `fill:${color};`;
            
            // Match the id="muscleId" ... style="fill:..." pattern
            result = result.replace(
                new RegExp(`(id="${id}"[^/]*?style=")([^"]*?)(")`,'g'),
                `$1${filterStyle}$3`
            );
            result = result.replace(
                new RegExp(`(id="${id}"[^/]*?)(style="fill:#[^"]*?")`,'g'),
                `$1style="${filterStyle}"`
            );
        }
        
        return result;
    }, [svgContent, activeMuscles]);

    if (!svgContent) return <div className="w-full h-full bg-zinc-900/50 rounded-xl animate-pulse" />;

    return (
        <div 
            className="w-full h-full flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: styledSvg() }}
        />
    );
}

// Phone Mockup Shell
function PhoneMockupShell({ children }) {
    return (
        <div className="relative w-[180px] h-[360px] flex-shrink-0">
            {/* Phone frame */}
            <div className="absolute inset-0 rounded-[2.5rem] border-2 border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-sm overflow-hidden">
                {/* Top notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-zinc-800/80 z-10" />
                {/* Screen content */}
                <div className="absolute inset-0 pt-8 pb-4 px-3 flex flex-col gap-1">
                    {/* App bar */}
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[8px] font-black text-brand tracking-widest">IRONCIRCLE</span>
                        <div className="w-4 h-4 rounded-full bg-zinc-800 border border-white/10" />
                    </div>
                    {/* Muscle map area */}
                    <div className="flex-1 flex items-center justify-center">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

const PLAN_KEYS = Object.keys(WORKOUT_PLANS);

export default function MuscleShowcase() {
    const [activePlan, setActivePlan] = useState(PLAN_KEYS[0]);
    const [view, setView] = useState('front');
    const [currentMuscles, setCurrentMuscles] = useState({});
    const [viewToggleTimer, setViewToggleTimer] = useState(null);

    const handlePlanSelect = (planKey) => {
        const plan = WORKOUT_PLANS[planKey];
        setActivePlan(planKey);
        setCurrentMuscles(plan.muscles);
        setView(plan.view);

        // Auto-toggle to rear after 2s if the plan's primary view is front & has rear muscles
        clearTimeout(viewToggleTimer);
        const hasRearMuscles = Object.keys(plan.muscles).some(k => 
            k.includes('_rear') || k === 'glutes' || k === 'hamstrings' || k === 'lower_back' || k === 'traps' || k === 'mid_back' || k === 'triceps'
        );
        const hasFrontMuscles = Object.keys(plan.muscles).some(k => 
            k === 'chest' || k.includes('_front') || k === 'quads' || k === 'biceps' || k === 'abs'
        );

        if (hasRearMuscles && hasFrontMuscles) {
            const timer = setTimeout(() => setView(v => v === 'front' ? 'rear' : 'front'), 2000);
            setViewToggleTimer(timer);
        }
    };

    // Initialize
    useEffect(() => {
        handlePlanSelect(PLAN_KEYS[0]);
        return () => clearTimeout(viewToggleTimer);
    }, []);

    return (
        <section className="py-32 px-6 lg:px-16 max-w-7xl mx-auto border-t border-white/5 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[400px] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16 relative z-10"
            >
                <h3 className="text-brand text-sm font-black tracking-[0.2em] uppercase mb-4 flex items-center justify-center gap-3">
                    ⚡ Smart Muscle Visualizer
                </h3>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
                    SIEH, WAS DU{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-dark">
                        WIRKLICH TRAINIERST.
                    </span>
                </h2>
                <p className="text-zinc-400 mt-4 max-w-xl mx-auto font-light">
                    Hover über einen Plan und sieh live, welche Muskeln aktiviert werden – inklusive automatischer Vorder-/Rückansicht.
                </p>
            </motion.div>

            {/* Main showcase layout */}
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
                
                {/* Left: Plan buttons */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col gap-3 w-full max-w-[260px]"
                >
                    <p className="text-zinc-500 text-xs uppercase tracking-[0.15em] font-bold mb-2">Trainingsplan wählen</p>
                    {PLAN_KEYS.map((planKey) => {
                        const isActive = activePlan === planKey;
                        const plan = WORKOUT_PLANS[planKey];
                        const muscleCount = Object.keys(plan.muscles).length;

                        return (
                            <motion.button
                                key={planKey}
                                onClick={() => handlePlanSelect(planKey)}
                                onMouseEnter={() => handlePlanSelect(planKey)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`relative w-full text-left px-5 py-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
                                    isActive 
                                        ? 'border-brand/40 bg-brand/5 shadow-[0_0_20px_rgba(250,255,0,0.08)]' 
                                        : 'border-white/5 bg-[#050505] hover:border-white/10 hover:bg-[#0a0a0a]'
                                }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="planHighlight"
                                        className="absolute inset-0 bg-brand/5"
                                        initial={false}
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                                    />
                                )}
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <div className={`font-bold text-sm ${isActive ? 'text-brand' : 'text-white'}`}>
                                            {planKey}
                                        </div>
                                        <div className="text-zinc-500 text-xs mt-0.5">{muscleCount} muscle groups</div>
                                    </div>
                                    {isActive && (
                                        <motion.div 
                                            initial={{ scale: 0 }} 
                                            animate={{ scale: 1 }}
                                            className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_6px_#faff00]"
                                        />
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}

                    {/* View toggle */}
                    <div className="mt-4 flex gap-2">
                        {['front', 'rear'].map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                    view === v 
                                        ? 'bg-brand/10 text-brand border border-brand/30' 
                                        : 'text-zinc-500 border border-white/5 hover:text-white'
                                }`}
                            >
                                {v === 'front' ? '▶ Vorne' : '◀ Hinten'}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Center: Phone mockup with muscle map */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    className="relative"
                >
                    {/* Glow behind phone */}
                    <div className="absolute inset-0 -m-8 bg-brand/10 rounded-full blur-[60px] pointer-events-none" />
                    
                    <PhoneMockupShell>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${view}-${activePlan}`}
                                initial={{ opacity: 0, scale: 0.95, rotateY: view === 'front' ? -10 : 10 }}
                                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                className="w-full h-full"
                            >
                                <MuscleMapInline 
                                    activeMuscles={currentMuscles} 
                                    view={view} 
                                />
                            </motion.div>
                        </AnimatePresence>
                    </PhoneMockupShell>

                    {/* View label */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                        {view === 'front' ? 'Vorderansicht' : 'Rückansicht'}
                    </div>
                </motion.div>

                {/* Right: Legend */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col gap-4 w-full max-w-[200px]"
                >
                    <p className="text-zinc-500 text-xs uppercase tracking-[0.15em] font-bold mb-2">Intensität</p>
                    {[
                        { label: 'Primary', color: '#faff00', glow: true },
                        { label: 'Secondary', color: '#d97706', glow: false },
                        { label: 'Low Impact', color: '#9a6a1a', glow: false },
                        { label: 'Inactive', color: '#757575', glow: false },
                    ].map(({ label, color, glow }) => (
                        <div key={label} className="flex items-center gap-3">
                            <div 
                                className="w-4 h-4 rounded-sm flex-shrink-0"
                                style={{ 
                                    backgroundColor: color,
                                    boxShadow: glow ? `0 0 8px ${color}` : 'none' 
                                }} 
                            />
                            <span className="text-zinc-400 text-xs font-medium">{label}</span>
                        </div>
                    ))}

                    {/* Active muscles list */}
                    {activePlan && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-zinc-500 text-xs uppercase tracking-[0.15em] font-bold mb-3">Aktive Muskeln</p>
                            <div className="space-y-1.5">
                                {Object.entries(currentMuscles)
                                    .sort(([,a],[,b]) => b - a)
                                    .slice(0, 5)
                                    .map(([id, intensity]) => (
                                    <div key={id} className="flex items-center gap-2">
                                        <div className="flex-1 h-1 rounded-full bg-zinc-800">
                                            <motion.div 
                                                className="h-full rounded-full"
                                                style={{ background: `linear-gradient(to right, #d97706, #faff00)` }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${intensity * 100}%` }}
                                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                            />
                                        </div>
                                        <span className="text-zinc-500 text-[10px] w-16 truncate capitalize">
                                            {id.replace('_', ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </section>
    );
}
