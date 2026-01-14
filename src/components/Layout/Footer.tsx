export default function Footer() {
    return (
        <footer className="w-full py-8 mt-12 border-t border-slate-100 bg-white/80 backdrop-blur-sm">
            <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2 group cursor-default">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100 group-hover:scale-105 transition-all duration-300">
                        $
                    </div>
                    <span className="font-bold text-slate-700 tracking-tight">ChiTieu<span className="text-indigo-600">App</span></span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-400 font-medium">&copy; {new Date().getFullYear()}</span>
                </div>

                <div className="flex items-center gap-8">
                    <a href="#" className="font-medium hover:text-indigo-600 transition-colors relative group">
                        About Us
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-300 group-hover:w-full"></span>
                    </a>
                    <a href="#" className="font-medium hover:text-indigo-600 transition-colors relative group">
                        Terms
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-300 group-hover:w-full"></span>
                    </a>
                    <a href="#" className="font-medium hover:text-indigo-600 transition-colors relative group">
                        Privacy
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-300 group-hover:w-full"></span>
                    </a>
                </div>

                <div className="text-xs text-slate-400 font-medium">
                    Designed with <span className="text-rose-500 animate-pulse inline-block">❤</span> by <a href="https://github.com/phongdh262" target="_blank" className="hover:text-indigo-500 transition-colors">Phong Dinh</a>
                </div>
            </div>
        </footer>
    );
}
