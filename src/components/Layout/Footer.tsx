export default function Footer() {
    return (
        <footer className="w-full py-6 mt-12 border-t border-slate-100 bg-white">
            <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Quản Lý Chi Tiêu</span>
                    <span>&copy; {new Date().getFullYear()}</span>
                </div>

                <div className="flex items-center gap-6">
                    <a href="#" className="hover:text-blue-600 transition-colors">Về chúng tôi</a>
                    <a href="#" className="hover:text-blue-600 transition-colors">Điều khoản</a>
                    <a href="#" className="hover:text-blue-600 transition-colors">Bảo mật</a>
                </div>

                <div className="text-xs text-slate-400">
                    Designed with <span className="text-red-400">❤</span> by Phong Dinh
                </div>
            </div>
        </footer>
    );
}
