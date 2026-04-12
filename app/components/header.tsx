import Link from "next/link"

export default function Header() {
    return (
        <header className="px-6 pt-12 pb-4 bg-white rounded-b-3xl shadow-sm border-b border-slate-100 flex justify-between items-center z-50 relative">
            {/* 홈으로 이동하는 메인 로고 */}
            <Link
                href="/"
                className="text-2xl font-black text-emerald-600 tracking-tighter hover:opacity-80 transition-opacity"
            >
                FIT-CORE
            </Link>

            {/* 마이페이지(로그인)로 이동하는 버튼 */}
            <Link
                href="/login"
                className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 shadow-sm transition-colors"
            >
                👤
            </Link>
        </header>
    )
}
