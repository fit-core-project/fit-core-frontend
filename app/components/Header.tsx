"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { User } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import AiStatusIndicator from "@/components/AiStatusIndicator"

function shouldHideHeader(pathname: string): boolean {
    return (
        pathname === "/login" ||
        pathname.startsWith("/ai_routine") ||
        pathname.startsWith("/ai_quicklog") ||
        pathname.startsWith("/ai_supplement") ||
        pathname.startsWith("/routine") ||
        pathname.startsWith("/oauth2") ||
        pathname.startsWith("/onboarding")
    )
}

export default function Header() {
    const pathname = usePathname()
    const user = useAuthStore((state) => state.user)

    if (shouldHideHeader(pathname)) return null

    return (
        <header className="relative z-50 flex min-h-14 items-center justify-between border-b border-hairline bg-ground px-4">
            <Link href="/" className="flex min-h-11 items-center gap-1.5 text-title-sm font-bold text-ink" aria-label="fit-core 홈">
                <span aria-hidden className="size-3 rounded-full border-[3px] border-ink" />
                fit-core
            </Link>

            <div className="flex items-center gap-2">
                <AiStatusIndicator />
                <Link
                    href={user ? "/my" : "/login"}
                    aria-label={user ? "마이 페이지" : "로그인"}
                    className="flex size-11 items-center justify-center overflow-hidden rounded-full hover:bg-surface"
                >
                    {user?.profileImage ? (
                        <Image src={user.profileImage} alt="" width={32} height={32} className="size-8 rounded-full object-cover" />
                    ) : (
                        <span className="flex size-8 items-center justify-center rounded-full bg-surface text-ink-2">
                            <User className="size-4" aria-hidden />
                        </span>
                    )}
                </Link>
            </div>
        </header>
    )
}
