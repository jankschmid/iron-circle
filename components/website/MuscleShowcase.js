"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WORKOUT_PLANS } from '@/lib/muscleEngine/muscleMapper';
import { PhoneMockup } from '@/components/website/Mockups';

// ─── Colour helpers ──────────────────────────────────────────────────────────
const INACTIVE   = '#757575';
const MID_COLOR  = '#d97706';
const ACTIVE     = '#faff00';
const NON_MUSCLE = '#434343';

function lerpHex(from, to, t) {
    const p = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
    const r = c => Math.round(c).toString(16).padStart(2, '0');
    return `#${r(p(from,1)+(p(to,1)-p(from,1))*t)}${r(p(from,3)+(p(to,3)-p(from,3))*t)}${r(p(from,5)+(p(to,5)-p(from,5))*t)}`;
}
function getMuscleColor(intensity) {
    if (intensity <= 0)   return INACTIVE;
    if (intensity < 0.5)  return lerpHex(INACTIVE, MID_COLOR, intensity * 2);
    return lerpHex(MID_COLOR, ACTIVE, (intensity - 0.5) * 2);
}

// ─── Inline SVG renderer – fetches the raw SVG and patches fill colours ──────
function MuscleMapSVG({ activeMuscles, view }) {
    const [svg, setSvg] = useState('');

    useEffect(() => {
        const path = view === 'front'
            ? '/assets/muscles/muscles_front.svg'
            : '/assets/muscles/muscles_rear.svg';
        fetch(path).then(r => r.text()).then(setSvg);
    }, [view]);

    const patched = useCallback(() => {
        if (!svg) return '';
        let out = svg;
        for (const [id, intensity] of Object.entries(activeMuscles)) {
            const color = getMuscleColor(intensity);
            const filter = intensity >= 1.0
                ? `fill:${color};filter:drop-shadow(0 0 6px ${ACTIVE});`
                : `fill:${color};`;
            // Replace existing style fill on this ID
            out = out.replace(
                new RegExp(`(id="${id}"[^>]*?style=")([^"]*?)(")`, 'g'),
                `$1${filter}$3`
            );
        }
        return out;
    }, [svg, activeMuscles]);

    if (!svg) return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800 animate-pulse" />
        </div>
    );

    return (
        <div
            className="w-full h-full flex items-center justify-center pt-14 pb-8 scale-[0.88] origin-center"
            dangerouslySetInnerHTML={{ __html: patched() }}
        />
    );
}

// ─── Muscle bar legend ───────────────────────────────────────────────────────
function MuscleBar({ id, intensity }) {
    return (
        <div className="flex items-center gap-2.5">
            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, #d97706, #faff00)` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${intensity * 100}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                />
            </div>
            <span className="text-zinc-500 text-[11px] w-20 truncate capitalize font-medium">
                {id.replace(/_/g, ' ')}
            </span>
        </div>
    );
}

// ─── Plan card button ─────────────────────────────────────────────────────────
function PlanButton({ label, muscleCount, isActive, onClick, onHover }) {
    return (
        <motion.button
            onClick={onClick}
            onMouseEnter={onHover}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`relative w-full text-left px-5 py-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
                isActive
                    ? 'border-brand/40 bg-brand/5 shadow-[0_0_24px_rgba(250,255,0,0.07)]'
                    : 'border-white/5 bg-[#050505] hover:border-white/10 hover:bg-[#0a0a0a]'
            }`}
        >
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <div className={`font-bold text-sm ${isActive ? 'text-brand' : 'text-white'}`}>{label}</div>
                    <div className="text-zinc-500 text-xs mt-0.5">{muscleCount} Muskelgruppen</div>
                </div>
                {isActive && (
                    <motion.div
                        key="dot"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-brand shadow-[0_0_8px_#faff00]"
                    />
                )}
            </div>
        </motion.button>
    );
}

const PLAN_KEYS = Object.keys(WORKOUT_PLANS);

export default function MuscleShowcase() {
    const [activePlan, setActivePlan] = useState(PLAN_KEYS[0]);
    const [view, setView] = useState('front');
    const [muscles, setMuscles] = useState({});
    const [autoToggle, setAutoToggle] = useState(null);

    const selectPlan = useCallback((key) => {
        const plan = WORKOUT_PLANS[key];
        setActivePlan(key);
        setMuscles(plan.muscles);
        setView(plan.view);

        clearTimeout(autoToggle);
        const ids = Object.keys(plan.muscles);
        const hasRear  = ids.some(k => ['lat_rear','traps','mid_back','lower_back','glutes','hamstrings','calves_rear','forearms_rear','triceps','delts_rear'].includes(k));
        const hasFront = ids.some(k => ['chest','quads','biceps','lat_front','obliques','calves_front','forearms_front','adductors','shins','delts_front'].includes(k));

        if (hasRear && hasFront) {
            const t = setTimeout(() => setView(v => v === 'front' ? 'rear' : 'front'), 2200);
            setAutoToggle(t);
        }
    }, [autoToggle]);

    useEffect(() => {
        selectPlan(PLAN_KEYS[0]);
        return () => clearTimeout(autoToggle);
    }, []);

    return (
        <section className="py-32 px-6 lg:px-16 max-w-7xl mx-auto border-t border-white/5 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-brand/5 blur-[150px] rounded-full pointer-events-none" />

            {/* Section header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-20 relative z-10"
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
                <p className="text-zinc-400 mt-5 max-w-xl mx-auto font-light text-lg leading-relaxed">
                    Hover über einen Trainingsplan und sieh live, welche Muskeln aktiviert werden – mit automatischer Vorder-/Rückansicht.
                </p>
            </motion.div>

            {/* Main three column layout */}
            <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-10 lg:gap-16">

                {/* ── Left: Plan selector ─────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col gap-3 w-full max-w-[260px] lg:mt-12"
                >
                    <p className="text-zinc-500 text-xs uppercase tracking-[0.15em] font-bold mb-1">Trainingsplan</p>

                    {PLAN_KEYS.map(key => (
                        <PlanButton
                            key={key}
                            label={key}
                            muscleCount={Object.keys(WORKOUT_PLANS[key].muscles).length}
                            isActive={activePlan === key}
                            onClick={() => selectPlan(key)}
                            onHover={() => selectPlan(key)}
                        />
                    ))}

                    {/* Front / Rear toggle */}
                    <div className="mt-3 flex gap-2">
                        {['front', 'rear'].map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                    view === v
                                        ? 'bg-brand/10 text-brand border border-brand/30'
                                        : 'text-zinc-500 border border-white/5 hover:text-white hover:border-white/10'
                                }`}
                            >
                                {v === 'front' ? '↗ Vorne' : '↖ Hinten'}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* ── Centre: Phone mockup ─────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    className="relative flex flex-col items-center"
                >
                    {/* Phone glow */}
                    <div className="absolute inset-0 -m-12 bg-brand/10 rounded-full blur-[80px] pointer-events-none" />

                    <PhoneMockup size="lg">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${view}-${activePlan}`}
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className="absolute inset-0"
                            >
                                <MuscleMapSVG activeMuscles={muscles} view={view} />
                            </motion.div>
                        </AnimatePresence>
                    </PhoneMockup>

                    {/* View label */}
                    <p className="mt-6 text-[11px] text-zinc-600 uppercase tracking-[0.2em] font-bold">
                        {view === 'front' ? 'Vorderansicht' : 'Rückansicht'}
                    </p>
                </motion.div>

                {/* ── Right: Intensity legend + active muscle bars ─────────── */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col gap-5 w-full max-w-[220px] lg:mt-12"
                >
                    {/* Colour legend */}
                    <div>
                        <p className="text-zinc-500 text-xs uppercase tracking-[0.15em] font-bold mb-3">Intensität</p>
                        {[
                            { label: 'Primary (PR)', color: '#faff00', glow: true  },
                            { label: 'Primary',      color: '#f59e0b', glow: false },
                            { label: 'Secondary',    color: '#92400e', glow: false },
                            { label: 'Inaktiv',      color: '#757575', glow: false },
                        ].map(({ label, color, glow }) => (
                            <div key={label} className="flex items-center gap-3 mb-2.5">
                                <div
                                    className="w-4 h-4 rounded flex-shrink-0"
                                    style={{ background: color, boxShadow: glow ? `0 0 8px ${color}` : 'none' }}
                                />
                                <span className="text-zinc-400 text-xs font-medium">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Per-muscle bars */}
                    <div className="border-t border-white/5 pt-5">
                        <p className="text-zinc-500 text-xs uppercase tracking-[0.15em] font-bold mb-3">Aktive Muskeln</p>
                        <div className="space-y-2.5">
                            {Object.entries(muscles)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 6)
                                .map(([id, intensity]) => (
                                    <MuscleBar key={id} id={id} intensity={intensity} />
                                ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
