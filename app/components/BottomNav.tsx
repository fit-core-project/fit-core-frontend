"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { BarChart2, Dumbbell, Home, Utensils, User } from "lucide-react"

const navItems = [
    { label: "홈", href: "/", icon: Home },
    { label: "운동", href: "/workout", icon: Dumbbell },
    { label: "식단", href: "/nutrition", icon: Utensils },
    { label: "통계", href: "/my?tab=stats", icon: BarChart2 },
    { label: "마이", href: "/my", icon: User },
]

function isActive(pathname: string, searchParams: URLSearchParams, href: string): boolean {
    if (href === "/") return pathname === "/"
    if (href === "/my?tab=stats") return pathname === "/my" && searchParams.get("tab") === "stats"
    if (href === "/my") return pathname === "/my" && searchParams.get("tab") !== "stats"
    return pathname === href
}

export default function BottomNav() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const router = useRouter()

    const itemClass = (active: boolean) =>
        `relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-caption transition-colors duration-150 ${
            active
                ? "font-bold text-ink before:absolute before:inset-x-5 before:top-0 before:h-[3px] before:rounded-full before:bg-ink"
                : "text-ink-2 hover:text-ink"
        }`

    return (
        <nav
            aria-label="주요 메뉴"
            className="w-full shrink-0 border-t border-hairline bg-ground px-1 pb-[env(safe-area-inset-bottom)]"
        >
            <div className="flex items-center">
                {navItems.map((item) => {
                    const active = isActive(pathname, searchParams, item.href)
                    const Icon = item.icon
                    const isMyTab = item.href === "/my" || item.href === "/my?tab=stats"

                    if (isMyTab) {
                        return (
                            <button
                                key={item.href}
                                type="button"
                                aria-current={active ? "page" : undefined}
                                onClick={() => router.replace(item.href, { scroll: false })}
                                className={itemClass(active)}
                            >
                                <Icon className="size-5" aria-hidden />
                                <span>{item.label}</span>
                            </button>
                        )
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={itemClass(active)}
                        >
                            <Icon className="size-5" aria-hidden />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
