"use client";
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-[#020202] text-zinc-200 font-sans selection:bg-brand/30 selection:text-brand">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <img src="/assets/logo/Iron-Circle_Logo_Two_Color.svg" alt="IronCircle Logo" className="w-8 h-8" />
                    <span className="text-xl font-extrabold tracking-tight text-white hidden sm:block">ironCircle</span>
                </div>
                <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-20">
                <div className="flex items-center gap-4 mb-12">
                     <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-brand shadow-inner">
                         <FileText className="w-8 h-8" />
                     </div>
                     <div>
                         <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Terms of Service</h1>
                         <p className="text-zinc-500 mt-2 font-medium tracking-widest uppercase text-sm">Last updated: 2026-03-24</p>
                     </div>
                </div>

                <div className="bg-[#050505] border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl space-y-12">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p className="text-zinc-400 leading-relaxed font-light">
                            By accessing and using IronCircle, you accept and agree to be bound by the terms and provision of this agreement. Lift heavy, lift safe.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. User Conduct</h2>
                        <p className="text-zinc-400 leading-relaxed font-light">
                            You agree to use the service for tracking valid workouts. Ego lifting and fake weights on the live gym leaderboards will result in eternal shame and a potential ban from the community.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Pro Subscriptions</h2>
                        <p className="text-zinc-400 leading-relaxed font-light">
                            Advanced analytics and premium features require a Pro subscription. Memberships are billed monthly or annually. Cancel anytime.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Liability</h2>
                        <p className="text-zinc-400 leading-relaxed font-light">
                            IronCircle is a tracking tool. We are not responsible for injuries caused by attempting 1RMs without a spotter. Always consult a fitness professional before starting any intense training regimen.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
