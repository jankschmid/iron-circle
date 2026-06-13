"use client";

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
import MuscleShowcase from '@/components/website/MuscleShowcase';

export default function LandingPage() {
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
                <MuscleShowcase />
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
