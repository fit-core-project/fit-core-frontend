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

    return (
        <nav
            aria-label="주요 메뉴"
            className="w-full shrink-0 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur"
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
                                className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-xs font-medium transition-colors ${
                                    active ? "bg-violet-50 text-violet-600" : "text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.label}</span>
                            </button>
                        )
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-xs font-medium transition-colors ${
                                active ? "bg-violet-50 text-violet-600" : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            <Icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
