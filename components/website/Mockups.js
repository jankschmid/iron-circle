import { Target, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * PhoneMockup
 * 
 * Renders a phone shell matching IronCircle design language.
 * 
 * Dynamic Image System:
 * - Place images in /public/assets/mockups/ as mockup_01.png, mockup_02.png etc.
 * - Pass mockupSrc="/assets/mockups/mockup_01.png" to display it
 * - The image is masked at top/bottom so it blends into the screen
 * 
 * @param {string}  [mockupSrc]     - Path to mockup image
 * @param {'sm'|'md'|'lg'|'xl'} [size='md']
 * @param {string}  [className]
 * @param {ReactNode} [children]
 */
export const PhoneMockup = ({ children, mockupSrc, size = 'md', className = "" }) => {
    const sizes = {
        sm:  { shell: 'w-[160px] h-[330px] rounded-[32px] border-[8px]',  notch: 'w-[70px] h-5'   },
        md:  { shell: 'w-[260px] h-[540px] rounded-[44px] border-[10px]', notch: 'w-[100px] h-6'   },
        lg:  { shell: 'w-[320px] h-[660px] rounded-[52px] border-[12px]', notch: 'w-[120px] h-7'   },
        xl:  { shell: 'w-[380px] h-[780px] rounded-[60px] border-[14px]', notch: 'w-[140px] h-8'   },
    };
    const s = sizes[size] || sizes.md;

    return (
        <div className={`relative mx-auto ${s.shell} bg-black border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-white/10 ${className}`}>
            {/* Dynamic Island / Notch */}
            <div className="absolute top-0 inset-x-0 flex justify-center z-30">
                <div className={`${s.notch} bg-zinc-900 rounded-b-2xl relative shadow-md`}>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-950 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-blue-900/40" />
                    </div>
                </div>
            </div>

            {/* Screen */}
            <div className="w-full h-full bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center text-zinc-700 font-medium text-sm">
                {mockupSrc ? (
                    <img
                        src={mockupSrc}
                        alt="App mockup"
                        className="absolute inset-0 w-full h-full object-cover object-top"
                        style={{
                            maskImage: 'linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%)',
                        }}
                    />
                ) : children || (
                    <div className="flex flex-col items-center gap-3 opacity-30">
                        <Target className="w-8 h-8" />
                        <span className="text-xs text-center px-4">Lege ein Bild unter<br />/public/assets/mockups/<br />mockup_01.png ab</span>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * MockupSlideshow
 * Cycles through mockup images at a given interval.
 * Automatically scans /public/assets/mockups/ via the /api/mockups endpoint.
 */
export const MockupSlideshow = ({ interval = 3000, size = 'md', className = '' }) => {
    const [images, setImages] = useState([]);
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        // Fetch the list of images found by the API
        fetch('/api/mockups')
            .then(res => res.json())
            .then(data => {
                if (data.images && data.images.length > 0) {
                    setImages(data.images);
                }
            })
            .catch(err => console.error('Failed to fetch mockups:', err));
    }, []);

    useEffect(() => {
        if (images.length <= 1) return;
        const timer = setInterval(() => setCurrent(i => (i + 1) % images.length), interval);
        return () => clearInterval(timer);
    }, [images.length, interval]);

    return (
        <PhoneMockup size={size} className={className} mockupSrc={images[current] || null} />
    );
};

export const TVMockup = ({ children, mockupSrc, className = "" }) => (
    <div className={`relative w-full max-w-[600px] aspect-video bg-black rounded-xl border-[8px] border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-white/10 ${className}`}>
        <div className="w-full h-full bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center text-zinc-700 font-medium text-sm">
            {mockupSrc ? (
                <img src={mockupSrc} alt="TV mockup" className="absolute inset-0 w-full h-full object-cover" />
            ) : children || (
                <div className="flex flex-col items-center gap-3 opacity-40">
                    <Monitor className="w-10 h-10" />
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
