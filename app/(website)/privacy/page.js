"use client";
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
                         <Shield className="w-8 h-8" />
                     </div>
                     <div>
                         <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Privacy Policy</h1>
                         <p className="text-zinc-500 mt-2 font-medium tracking-widest uppercase text-sm">Last updated: 2026-03-24</p>
                     </div>
                </div>

                <div className="bg-[#050505] border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl space-y-12">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Data Collection</h2>
                        <p className="text-zinc-400 leading-relaxed font-light">
                            We collect your email, name, and workout data to provide the IronCircle service. Ideally, we would collect nothing, but we need to authenticate you and store your impressive lifts.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. Usage</h2>
                        <p className="text-zinc-400 leading-relaxed font-light">
                            Your data is used solely to track your progress and show off to your friends. We do not sell your data to third parties because we are not evil.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Gym Groups</h2>
                        <p className="text-zinc-400 leading-relaxed font-light">
                            If you join a Gym Group, other members of that gym may see your public profile and workout summaries. It helps build community and friendly rivalry.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Deletion</h2>
                        <p className="text-zinc-400 leading-relaxed font-light">
                            You can request account deletion at any time. We will wipe your data faster than you can say "lightweight baby!".
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
