"use client";

import { useStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import LiveStatus from '@/components/LiveStatus';
import OperationsDashboard from '@/components/OperationsDashboard';
import GoalSelectorModal from '@/components/GoalSelectorModal'; 
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/TranslationContext';
import { useScroll, useTransform } from 'framer-motion';

// Modular Website Components
import Header from '@/components/website/Header';
import Hero from '@/components/website/Hero';
import TrustBanner from '@/components/website/TrustBanner';
import BentoB2C from '@/components/website/BentoB2C';
import DashboardB2B from '@/components/website/DashboardB2B';
import HowItWorks from '@/components/website/HowItWorks';
import Pricing from '@/components/website/Pricing';
import FAQ from '@/components/website/FAQ';
import WallOfFame from '@/components/website/WallOfFame';
import CTA from '@/components/website/CTA';
import Footer from '@/components/website/Footer';

// --- Landing Page Component ---
function LandingPage() {
    const { scrollYProgress } = useScroll();
    
    const yHeroText = useTransform(scrollYProgress, [0, 0.5], [0, 100]);
    const opacityHeroText = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
    const yFloating1 = useTransform(scrollYProgress, [0, 1], [0, -150]);
    const yFloating2 = useTransform(scrollYProgress, [0, 1], [0, -80]);

    return (
        <div className="min-h-screen bg-[#020202] text-zinc-200 font-sans selection:bg-brand/30 selection:text-brand overflow-x-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand/10 blur-[120px] rounded-full pointer-events-none z-0" />
            
            <Header />

            <main className="relative z-10">
                <Hero 
                    yHeroText={yHeroText} 
                    opacityHeroText={opacityHeroText} 
                    yFloating1={yFloating1} 
                    yFloating2={yFloating2} 
                />
                <TrustBanner />
                <BentoB2C />
                <DashboardB2B />
                <HowItWorks />
                <Pricing />
                <FAQ />
                <WallOfFame />
                <CTA />
            </main>

            <Footer />
        </div>
    );
}

// --- App Dashboard Component (Authenticated) ---
export default function Home() {
    const { t } = useTranslation();
    const { user, isLoading, activeWorkout, getWeeklyStats } = useStore();
    const router = useRouter();
    const supabase = createClient();
    const [isLongLoading, setIsLongLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!user && isLoading) {
                setIsLongLoading(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [user, isLoading]);

    useEffect(() => {
        if (user && !user.setup_completed) {
            router.push('/profile/setup');
        }
    }, [user, router]);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error("SignOut failed", e);
        } finally {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login';
        }
    };

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'var(--background)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className="spinner"></div>
                    <p>{t('Syncing...')}</p>
                </div>
                <style jsx>{`
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid var(--surface-highlight);
                        border-top: 4px solid var(--primary);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!user) {
        return <LandingPage />;
    }

    const { volumeByDay } = getWeeklyStats();

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ padding: '24px 0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <img src="/assets/logo/Iron-Circle_Logo_Two_Color.svg" alt="Logo" style={{ width: '32px', height: '32px' }} />
                        <h1 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>IronCircle</h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('Welcome back')}, {user.name ? user.name.split(' ')[0] : t('Athlete')}</p>
                    <button onClick={handleLogout} style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px', textDecoration: 'underline' }}>{t('Logout')}</button>
                </div>
                <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id || 'guest'}`} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--border)' }} />
            </header>

            {(!user.gymId || !user.height) ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p>{t('Redirecting to setup...')}</p>
                </div>
            ) : (
                <>
                    <LiveStatus />
                    <section style={{ marginTop: '16px' }}>
                        <Link href="/tracker" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                padding: '20px',
                                borderRadius: 'var(--radius-lg)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '16px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: 'var(--surface-highlight)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem'
                                    }}>📍</div>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{t('Gym Tracker')}</h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {user.gymId ? (user.auto_tracking_enabled ? t('Auto-Tracking On') : t('Manual Mode')) : t('Set Home Gym')}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>→</div>
                            </div>
                        </Link>
                    </section>

                    <section style={{ marginTop: '24px', marginBottom: '24px' }}>
                        <OperationsDashboard userId={user.id} />
                    </section>

                    <section style={{ marginTop: '32px' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>{t('Weekly Volume')}</h3>
                        <div style={{
                            background: 'var(--surface)',
                            padding: '20px',
                            borderRadius: 'var(--radius-md)',
                            height: '150px',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            gap: '8px'
                        }}>
                            {volumeByDay.map((h, i) => (
                                <div key={i} style={{
                                    width: '100%',
                                    height: `${(h / (Math.max(...volumeByDay) || 1)) * 100}%`,
                                    background: i === new Date().getDay() - 1 ? 'var(--primary)' : 'var(--border)',
                                    borderRadius: '4px 4px 0 0',
                                    opacity: 0.8
                                }} />
                            ))}
                        </div>
                    </section>
                </>
            )}

            <GoalSelectorModal />
            <BottomNav />
        </div>
    );
}
