"use client"

import Link from "next/link"
import { useAuthStore } from "@/store/authStore"
import Image from "next/image" // Next.js의 Image 컴포넌트 사용 권장
import AiStatusIndicator from "@/components/AiStatusIndicator"

export default function Header() {
    const user = useAuthStore((state) => state.user)

    return (
        <header className="px-6 pt-12 pb-4 bg-white rounded-b-3xl shadow-sm border-b border-slate-100 flex justify-between items-center z-50 relative">
            <Link
                href="/"
                className="text-2xl font-black text-emerald-600 tracking-tighter hover:opacity-80 transition-opacity"
            >
                FIT-CORE
            </Link>

            <div className="flex items-center gap-3">
                <AiStatusIndicator />
                {/* 로그인 상태에 따른 조건부 렌더링 */}
                <Link
                    href={user ? "/my" : "/login"}
                    className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center overflow-hidden hover:bg-slate-200 shadow-sm transition-colors"
                >
                    {user?.profileImage ? (
                        <Image
                            src={user.profileImage}
                            alt="프로필 이미지"
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <span className="text-slate-500">👤</span>
                    )}
                </Link>
            </div>
        </header>
    )
}
