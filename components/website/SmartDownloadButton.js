"use client";

import { useState, useEffect } from 'react';
import { Smartphone, Download, Apple, QrCode, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Drop your built APK into /public/downloads/ and update the filename:
const ANDROID_APK_PATH = '/downloads/ironcircle.apk';

// Set your App Store link once you're live:
const IOS_APP_STORE_URL = 'https://apps.apple.com/app/ironcircle'; // placeholder

// Set your Play Store link once you're live:
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.ironcircle.app'; // placeholder
// ─────────────────────────────────────────────────────────────────────────────

function detectPlatform() {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
    return 'desktop';
}

// QR code modal for desktop users
function QRModal({ onClose }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.25 }}
                className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-4">
                    <QrCode className="w-6 h-6 text-brand" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Auf dem Handy öffnen</h3>
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                    Öffne diese Seite auf deinem Gerät, um die App direkt herunterzuladen.
                </p>

                {/* QR Code – points to current page */}
                <div className="bg-white rounded-2xl p-3 mx-auto w-fit mb-6">
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://ironcircle.app')}`}
                        alt="QR Code"
                        className="w-44 h-44 rounded-lg"
                    />
                </div>

                <div className="flex gap-3">
                    <a
                        href={ANDROID_APK_PATH}
                        download
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#151515] border border-white/10 rounded-xl text-white text-sm font-semibold hover:border-brand/30 transition-colors"
                    >
                        <Smartphone className="w-4 h-4 text-brand" />
                        Android APK
                    </a>
                    <a
                        href={IOS_APP_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#151515] border border-white/10 rounded-xl text-white text-sm font-semibold hover:border-brand/30 transition-colors"
                    >
                        <Apple className="w-4 h-4" />
                        App Store
                    </a>
                </div>
            </motion.div>
        </motion.div>
    );
}

/**
 * SmartDownloadButton
 * 
 * Detects the user's platform and shows the appropriate download option:
 * - Android → direct APK download from /public/downloads/ironcircle.apk
 * - iOS     → App Store redirect
 * - Desktop → QR code modal with both options
 * 
 * @param {string} [variant='primary'] - 'primary' | 'secondary'
 * @param {string} [className]
 */
export default function SmartDownloadButton({ variant = 'primary', className = '' }) {
    const [platform, setPlatform] = useState('unknown');
    const [showQR, setShowQR] = useState(false);

    useEffect(() => {
        setPlatform(detectPlatform());
    }, []);

    const handleClick = () => {
        if (platform === 'android') {
            // Direct APK download
            const link = document.createElement('a');
            link.href = ANDROID_APK_PATH;
            link.download = 'ironcircle.apk';
            link.click();
        } else if (platform === 'ios') {
            window.open(IOS_APP_STORE_URL, '_blank');
        } else {
            setShowQR(true);
        }
    };

    const label = platform === 'android'
        ? 'Android APK herunterladen'
        : platform === 'ios'
        ? 'Im App Store'
        : 'App herunterladen';

    const Icon = platform === 'ios' ? Apple : platform === 'android' ? Download : Smartphone;

    const primaryClass = `group relative flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-brand to-brand-dark text-black font-extrabold text-base rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(250,255,0,0.3)] hover:shadow-[0_0_40px_rgba(250,255,0,0.5)] hover:-translate-y-1 overflow-hidden ${className}`;
    const secondaryClass = `group flex items-center justify-center gap-2.5 px-8 py-4 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 text-white font-bold text-base rounded-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-md ${className}`;

    return (
        <>
            <button
                onClick={handleClick}
                className={variant === 'primary' ? primaryClass : secondaryClass}
                aria-label={label}
            >
                {variant === 'primary' && (
                    <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
                )}
                <span className="relative z-10 flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    {label}
                </span>
            </button>

            <AnimatePresence>
                {showQR && <QRModal onClose={() => setShowQR(false)} />}
            </AnimatePresence>
        </>
    );
}
