import { Sparkles } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="w-full py-4 mt-8 border-t border-white/[0.04] bg-transparent backdrop-blur-sm relative z-10">
            <div className="px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-white/40">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
                        <Sparkles className="w-3 h-3" />
                    </div>
                    <span className="font-bold text-white/70 tracking-tight text-sm">ChiTiêu<span className="text-indigo-400">App</span></span>
                    <span className="text-white/20">|</span>
                    <span className="font-medium tracking-wide">&copy; {new Date().getFullYear()}</span>
                </div>

                <div>
                    Made with <span className="text-rose-400 inline-block animate-pulse">❤</span> by <a href="https://github.com/phongdh262" target="_blank" className="hover:text-indigo-400 text-white/60 font-medium transition-colors">Phong Dinh</a>
                </div>
            </div>
        </footer>
    );
}
