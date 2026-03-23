import { Target, Monitor } from 'lucide-react';

export const PhoneMockup = ({ children, className = "" }) => (
    <div className={`relative mx-auto w-[260px] h-[540px] bg-black rounded-[44px] border-[10px] border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-white/10 ${className}`}>
        {/* Dynamic Notch */}
        <div className="absolute top-0 inset-x-0 h-7 bg-transparent flex justify-center z-30">
            <div className="w-[100px] h-6 bg-zinc-900 rounded-b-2xl relative shadow-md">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-950 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-blue-900/40" />
                </div>
            </div>
        </div>
        {/* Screen */}
        <div className="w-full h-full bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center text-zinc-700 font-medium text-sm">
            {children || (
                <div className="flex flex-col items-center gap-3">
                    <Target className="w-8 h-8 opacity-20" />
                    <span>App Screenshot Here</span>
                </div>
            )}
        </div>
    </div>
);

export const TVMockup = ({ children, className = "" }) => (
    <div className={`relative w-full max-w-[600px] aspect-video bg-black rounded-xl border-[8px] border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-white/10 ${className}`}>
        {/* Screen */}
        <div className="w-full h-[calc(100%-8px)] bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center text-zinc-700 font-medium text-sm">
            {children || (
                <div className="flex flex-col items-center gap-3">
                    <Monitor className="w-10 h-10 opacity-20" />
                    <span>Dashboard Screenshot Here</span>
                </div>
            )}
        </div>
        {/* Bottom Bezel */}
        <div className="absolute bottom-0 inset-x-0 h-2 bg-zinc-800 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-brand rounded-full shadow-[0_0_5px_rgba(250,255,0,0.8)]" />
        </div>
    </div>
);
