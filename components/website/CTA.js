import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SmartDownloadButton from './SmartDownloadButton';

export default function CTA() {
    return (
        <section className="relative pt-24 pb-12 px-6 lg:px-16 border-t border-white/5 bg-gradient-to-b from-[#020202] to-black overflow-hidden flex flex-col items-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand/10 blur-[150px] rounded-full pointer-events-none z-0" />
            
            <div className="relative z-10 w-full max-w-4xl mx-auto text-center flex flex-col items-center bg-[#050505] border border-white/5 rounded-[3rem] p-12 lg:p-20 shadow-2xl relative overflow-hidden group hover:border-brand/20 transition-colors duration-500">
                {/* Glow inside card */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[80px] rounded-full pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                
                <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight relative z-10">Bereit für den <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-dark">IronCircle</span>?</h2>
                <p className="text-lg text-zinc-400 max-w-2xl mb-10 font-light relative z-10">Egal ob du als Athlet dein nächstes PR jagst oder als Studiobesitzer eine Elite-Community aufbaust – deine Reise beginnt hier.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 z-10">
                    <Link href="/login" className="group/btn relative flex items-center justify-center gap-3 px-12 py-5 bg-gradient-to-r from-brand to-brand-dark text-black font-extrabold text-xl rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(250,255,0,0.2)] hover:shadow-[0_0_50px_rgba(250,255,0,0.4)] hover:-translate-y-1 overflow-hidden">
                        <div className="absolute inset-0 bg-white/40 translate-y-[100%] group-hover/btn:translate-y-[0%] transition-transform duration-300" />
                        <span className="relative z-10 flex items-center gap-2">Kostenlos starten <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" /></span>
                    </Link>
                    <SmartDownloadButton variant="secondary" />
                </div>
            </div>
        </section>
    );
}
