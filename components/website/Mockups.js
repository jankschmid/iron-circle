"use client";
import { Target, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// MOCKUP CONFIG
// Lege deine Screenshots als .webp in /public/assets/mockups/
const PHONE_MOCKUP_COUNT = 4; // mockup_01.webp … mockup_04.webp
const TV_MOCKUP_COUNT    = 3; // mockup_tv_01.webp … mockup_tv_03.webp
// ─────────────────────────────────────────────────────────────────────────────

const PHONE_IMAGES = Array.from(
    { length: PHONE_MOCKUP_COUNT },
    (_, i) => `/assets/mockups/mockup_${String(i + 1).padStart(2, '0')}.webp`
);

const TV_IMAGES = Array.from(
    { length: TV_MOCKUP_COUNT },
    (_, i) => `/assets/mockups/mockup_tv_${String(i + 1).padStart(2, '0')}.webp`
);

// Shared sizes map
const SIZES = {
    sm: { shell: 'w-[160px] h-[330px] rounded-[32px] border-[8px]',  notch: 'w-[70px] h-5'   },
    md: { shell: 'w-[260px] h-[540px] rounded-[44px] border-[10px]', notch: 'w-[100px] h-6'   },
    lg: { shell: 'w-[320px] h-[660px] rounded-[52px] border-[12px]', notch: 'w-[120px] h-7'   },
    xl: { shell: 'w-[380px] h-[780px] rounded-[60px] border-[14px]', notch: 'w-[140px] h-8'   },
};

// ─── PhoneShell – reusable frame ──────────────────────────────────────────────
function PhoneShell({ size = 'md', className = '', children }) {
    const s = SIZES[size] || SIZES.md;
    return (
        <div className={`relative mx-auto ${s.shell} bg-black border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-white/10 ${className}`}>
            <div className="absolute top-0 inset-x-0 flex justify-center z-30">
                <div className={`${s.notch} bg-zinc-900 rounded-b-2xl relative shadow-md`}>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-950 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-blue-900/40" />
                    </div>
                </div>
            </div>
            <div className="w-full h-full bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center text-zinc-700 font-medium text-sm">
                {children}
            </div>
        </div>
    );
}

// ─── Masked screen image ──────────────────────────────────────────────────────
function ScreenImage({ src, alt = 'App mockup' }) {
    return (
        <img
            src={src}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%)',
            }}
        />
    );
}

/**
 * PhoneMockup
 * 
 * Pass mockupIndex (1-based) to load the corresponding webp.
 * e.g. mockupIndex={1} → /assets/mockups/mockup_01.webp
 * 
 * @param {number}  [mockupIndex]  - 1 = mockup_01.webp, 2 = mockup_02.webp …
 * @param {string}  [mockupSrc]   - Direct URL override
 * @param {'sm'|'md'|'lg'|'xl'} [size='md']
 * @param {string}  [className]
 * @param {ReactNode} [children]  - Fallback content
 */
export const PhoneMockup = ({ children, mockupSrc, mockupIndex, size = 'md', className = '' }) => {
    const indexedSrc = mockupIndex
        ? `/assets/mockups/mockup_${String(mockupIndex).padStart(2, '0')}.webp`
        : null;
    const finalSrc = mockupSrc || indexedSrc;

    return (
        <PhoneShell size={size} className={className}>
            {finalSrc ? (
                <ScreenImage src={finalSrc} />
            ) : children || (
                <div className="flex flex-col items-center gap-3 opacity-30">
                    <Target className="w-8 h-8" />
                    <span className="text-xs text-center px-4">
                        mockup_01.webp<br />→ /public/assets/mockups/
                    </span>
                </div>
            )}
        </PhoneShell>
    );
};

/**
 * MockupSlideshow
 * Cycles through all configured phone mockups (PHONE_IMAGES) with a smooth crossfade.
 * Update PHONE_MOCKUP_COUNT at the top of this file to add/remove images.
 */
export const MockupSlideshow = ({ interval = 5000, size = 'md', className = '' }) => {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (PHONE_IMAGES.length <= 1) return;
        const timer = setInterval(() => setCurrent(i => (i + 1) % PHONE_IMAGES.length), interval);
        return () => clearInterval(timer);
    }, [interval]);

    return (
        <PhoneShell size={size} className={className}>
            <AnimatePresence mode="sync">
                <motion.img
                    key={current}
                    src={PHONE_IMAGES[current]}
                    alt="App mockup"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: 'easeInOut' }}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    style={{
                        maskImage: 'linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%)',
                    }}
                />
            </AnimatePresence>
        </PhoneShell>
    );
};

export const TVMockup = ({ children, mockupSrc, className = "" }) => (
    <div className={`relative w-full max-w-[600px] aspect-video bg-black rounded-xl border-[8px] border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-white/10 ${className}`}>
        <div className="w-full h-full bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center text-zinc-700 font-medium text-sm">
            {mockupSrc ? (
                <img src={mockupSrc} alt="TV mockup" className="absolute inset-0 w-full h-full object-cover" />
            ) : children || (
                <div className="flex flex-col items-center gap-3 opacity-40">
                    <Monitor className="w-10 h-10" />
                    <span>Dashboard screenshot hier</span>
                </div>
            )}
        </div>
        <div className="absolute bottom-0 inset-x-0 h-2 bg-zinc-800 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-brand rounded-full shadow-[0_0_5px_rgba(250,255,0,0.8)]" />
        </div>
    </div>
);

/**
 * TVMockupSlideshow
 * Cycles through mockup_tv_01.webp … mockup_tv_03.webp with a smooth crossfade.
 * Update TV_MOCKUP_COUNT at the top of this file to add/remove images.
 */
export const TVMockupSlideshow = ({ interval = 5000, className = '' }) => {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (TV_IMAGES.length <= 1) return;
        const timer = setInterval(() => setCurrent(i => (i + 1) % TV_IMAGES.length), interval);
        return () => clearInterval(timer);
    }, [interval]);

    return (
        <div className={`relative w-full max-w-[600px] aspect-video bg-black rounded-xl border-[8px] border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-white/10 ${className}`}>
            <div className="w-full h-full bg-zinc-950 relative overflow-hidden">
                <AnimatePresence mode="sync">
                    <motion.img
                        key={current}
                        src={TV_IMAGES[current]}
                        alt="Dashboard mockup"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: 'easeInOut' }}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                </AnimatePresence>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-2 bg-zinc-800 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-brand rounded-full shadow-[0_0_5px_rgba(250,255,0,0.8)]" />
            </div>
        </div>
    );
};
