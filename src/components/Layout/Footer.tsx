import { Sparkles } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="w-full py-4 mt-8 border-t border-slate-200/60 dark:border-white/[0.04] bg-transparent backdrop-blur-sm relative z-10 transition-colors duration-300">
            <div className="px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-white/40 transition-colors duration-300">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
                        <Sparkles className="w-3 h-3" />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-white/70 tracking-tight text-sm transition-colors duration-300">ChiTiêu<span className="text-indigo-600 dark:text-indigo-400 transition-colors duration-300">App</span></span>
                    <span className="text-slate-300 dark:text-white/20 transition-colors duration-300">|</span>
                    <span className="font-medium tracking-wide transition-colors duration-300">&copy; {new Date().getFullYear()}</span>
                </div>

                <div className="transition-colors duration-300">
                    Made with <span className="text-rose-500 dark:text-rose-400 inline-block animate-pulse transition-colors duration-300">❤</span> by <a href="https://github.com/phongdh262" target="_blank" className="text-slate-600 hover:text-indigo-600 dark:text-white/60 dark:hover:text-indigo-400 font-medium transition-colors duration-300">Phong Dinh</a>
                </div>
            </div>
        </footer>
    );
}
