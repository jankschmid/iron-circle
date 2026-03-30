import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="px-8 flex flex-col items-center py-8 bg-black border-t border-white/10 text-center text-zinc-500 text-sm">
            <img src="/assets/logo/Iron-Circle_Logo_Two_Color.svg" alt="Logo" className="w-8 h-8 opacity-30 grayscale mb-6" />
            <div className="flex flex-wrap justify-center gap-8 font-medium mb-6">
                <Link href="/privacy" className="hover:text-white transition-colors">Datenschutzerklärung</Link>
                <Link href="/terms" className="hover:text-white transition-colors">AGB</Link>
                <Link href="/feedback" className="hover:text-brand transition-colors">Bewertung abgeben</Link>
                <Link href="/contact" className="hover:text-white transition-colors">Support kontaktieren</Link>
                <Link href="/login" className="hover:text-brand transition-colors">Studio-Admin Login</Link>
            </div>
            <span className="font-semibold tracking-[0.2em] text-[10px] uppercase">© {new Date().getFullYear()} IRONCIRCLE. GEBAUT FÜR ATHLETEN.</span>
        </footer>
    );
}
