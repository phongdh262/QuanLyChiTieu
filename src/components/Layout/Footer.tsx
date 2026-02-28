export default function Footer() {
    return (
        <footer className="w-full py-4 mt-4 border-t border-slate-100/60 bg-white/60">
            <div className="px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-[10px] shadow-sm">
                        $
                    </div>
                    <span className="font-bold text-slate-600 tracking-tight text-sm">ChiTieu<span className="text-indigo-500">App</span></span>
                    <span className="text-slate-200">|</span>
                    <span className="text-slate-400 font-medium">&copy; {new Date().getFullYear()}</span>
                </div>

                <div className="text-[11px] text-slate-400">
                    Made with <span className="text-rose-400 inline-block">❤</span> by <a href="https://github.com/phongdh262" target="_blank" className="hover:text-indigo-500 font-medium transition-colors">Phong Dinh</a>
                </div>
            </div>
        </footer>
    );
}
