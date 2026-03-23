import Link from 'next/link';

export default function Header() {
    return (
        <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 transition-all">
            <div className="flex items-center gap-3 relative z-10">
                <img src="/assets/logo/Iron-Circle_Logo_Two_Color.svg" alt="IronCircle Logo" className="w-8 h-8" />
                <span className="text-xl font-extrabold tracking-tight text-white hidden sm:block">ironCircle</span>
            </div>
            <nav className="flex items-center gap-6 sm:gap-8 text-sm font-medium relative z-10">
                <a href="#b2c" className="text-zinc-400 hover:text-white transition-colors hidden sm:block">Athlete</a>
                <a href="#b2b" className="text-zinc-400 hover:text-white transition-colors hidden sm:block">Gym Partners</a>
                <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">Login</Link>
                <Link href="/login" className="relative group overflow-hidden px-5 py-2.5 bg-white/5 border border-white/10 hover:border-brand/50 hover:bg-brand/10 text-white font-semibold rounded-full transition-all duration-300 shadow-md">
                    <span className="relative z-10 flex items-center gap-2">
                        Download App
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Link>
            </nav>
        </header>
    );
}
