"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Lock, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';

export default function AppUpgradePage() {
    const router = useRouter();
    const [status, setStatus] = useState('idle');

    const handleSubscribe = (tier) => {
        setStatus(`loading-${tier}`);
        setTimeout(() => {
            alert(`Stripe Checkout Mock: In a real app, this redirects to Stripe Billing Portal to complete the ${tier} subscription.`);
            setStatus('idle');
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#020202] text-zinc-200 font-sans selection:bg-brand/30 selection:text-brand flex flex-col pb-24">
            <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <div className="text-white font-bold tracking-widest uppercase text-xs">Manage Subscription</div>
                <div className="w-5" /> {/* Spacer */}
            </header>

            <main className="flex-1 px-4 sm:px-6 py-12 relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand/10 blur-[150px] rounded-full pointer-events-none z-0" />
                
                <div className="w-full max-w-4xl relative z-10 text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 text-brand mb-6 shadow-[0_0_30px_rgba(250,255,0,0.2)]">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
                        Wähle dein <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-dark">Level</span>
                    </h1>
                    <p className="text-zinc-400 font-light text-base md:text-lg">
                        Dein aktuelles Level: <span className="text-white font-bold ml-1">Free Athlete</span>
                    </p>
                </div>

                {/* 3 Tier Athlete Grid */}
                <div className="w-full max-w-6xl grid lg:grid-cols-3 gap-6 relative z-10 lg:items-stretch">
                    
                    {/* Tier 1: Free */}
                    <div className="bg-[#050505] border border-white/5 rounded-3xl p-8 hover:bg-[#0a0a0a] transition-colors flex flex-col">
                        <div className="mb-8">
                            <h4 className="text-xl text-white font-bold mb-2">Free Athlete</h4>
                            <div className="flex items-baseline gap-1 mt-1 mb-4">
                                <span className="text-4xl font-black text-white">€0</span>
                                <span className="text-zinc-500 font-medium text-sm">/ Monat</span>
                            </div>
                            <p className="text-zinc-400 font-light text-sm">Für den Einstieg in smarte Progression.</p>
                        </div>
                        <ul className="space-y-4 mb-10 flex-1">
                            {[
                                "Workouts loggen (RPE & RIR)",
                                "Zugriff auf dein Gym Leaderboard",
                                "Basis Statistiken",
                                "Standard Algorithmus"
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3 text-zinc-300 text-sm">
                                    <div className="mt-0.5 w-5 h-5 rounded-full bg-white/5 flex flex-shrink-0 items-center justify-center text-brand">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <span className="leading-snug">{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <button disabled className="mt-auto w-full text-center py-4 bg-white/5 text-zinc-500 font-bold rounded-xl cursor-not-allowed">
                            Current Plan
                        </button>
                    </div>

                    {/* Tier 2: Advanced */}
                    <div className="bg-[#050505] border border-white/10 hover:border-brand/30 rounded-3xl p-8 transition-colors flex flex-col group">
                        <div className="mb-8">
                            <h4 className="text-xl text-white font-bold mb-2">Advanced Athlete</h4>
                            <div className="flex items-baseline gap-1 mt-1 mb-4">
                                <span className="text-4xl font-black text-white">€4.99</span>
                                <span className="text-zinc-500 font-medium text-sm">/ Monat</span>
                            </div>
                            <p className="text-zinc-400 font-light text-sm">Mehr Insights für dein Hypertrophie-Training.</p>
                        </div>
                        <ul className="space-y-4 mb-10 flex-1">
                            {[
                                "Alles aus Free",
                                "Erweiterte Muscle-Heatmap",
                                "Advanced Analytics Dashboard",
                                "Unlimitierte Custom Exercises",
                                "Premium Priority Support"
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3 text-zinc-200 text-sm">
                                    <div className="mt-0.5 w-5 h-5 rounded-full bg-white/10 group-hover:bg-brand/20 flex flex-shrink-0 items-center justify-center text-brand transition-colors">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <span className="leading-snug">{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <button 
                            onClick={() => handleSubscribe('Advanced')}
                            disabled={status !== 'idle'}
                            className="mt-auto w-full flex items-center justify-center gap-2 text-center py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors disabled:opacity-70"
                        >
                            {status === 'loading-Advanced' ? 'Loading checkout...' : 'Select Advanced'}
                        </button>
                    </div>

                    {/* Tier 3: Pro Elite (Highlight) */}
                    <div className="bg-[#050505] border border-brand/40 shadow-[0_0_30px_rgba(250,255,0,0.15)] rounded-3xl p-8 lg:p-10 relative overflow-hidden group flex flex-col transform lg:-translate-y-4">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[80px] rounded-full pointer-events-none" />
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand to-brand-dark" />
                        
                        <div className="mb-8">
                            <h4 className="text-xl text-white font-bold mb-2 flex flex-wrap items-center justify-between gap-2">
                                <span className="flex items-center gap-2">Pro Elite</span>
                                <span className="text-[10px] uppercase tracking-widest bg-brand/10 text-brand px-2 py-1 rounded-md font-bold">Popular</span>
                            </h4>
                            <div className="flex items-baseline gap-1 mt-1 mb-4">
                                <span className="text-5xl font-black text-brand">€8.99</span>
                                <span className="text-zinc-500 font-medium text-sm">/ Monat</span>
                            </div>
                            <p className="text-zinc-300 font-light text-sm">Entfessle den vollen Predictive Overload AI.</p>
                        </div>
                        <ul className="space-y-4 mb-10 flex-1 relative z-10">
                            {[
                                "Alles aus Advanced",
                                "Predictive Overload AI Algorithmus",
                                "Mastery Phase & Plateaubreaker",
                                "1RM Vorhersage AI",
                                "Premium Profile Badge 👑"
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3 text-white text-sm font-medium">
                                    <div className="mt-0.5 w-5 h-5 rounded-full bg-brand/20 flex flex-shrink-0 items-center justify-center text-brand">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <span className="leading-snug">{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <button 
                            onClick={() => handleSubscribe('Pro')}
                            disabled={status !== 'idle'}
                            className="mt-auto w-full relative flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-brand to-brand-dark text-black font-extrabold text-lg rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(250,255,0,0.2)] hover:shadow-[0_0_40px_rgba(250,255,0,0.4)] hover:-translate-y-1 active:scale-95 disabled:opacity-70 z-10"
                        >
                            {status === 'loading-Pro' ? 'Loading checkout...' : (
                                <>
                                    <Zap className="w-5 h-5" /> Upgrade to Pro
                                </>
                            )}
                        </button>
                    </div>

                </div>
                
                <p className="text-center text-zinc-600 text-[10px] tracking-wide mt-10 uppercase font-black">Secure Payment Processing via Stripe. Cancel anytime.</p>
            </main>
        </div>
    );
}
