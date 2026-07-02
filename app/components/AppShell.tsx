"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"
import BottomNav from "./BottomNav"

function shouldHideBottomNav(pathname: string): boolean {
    return (
        pathname === "/login" ||
        pathname.startsWith("/ai_routine") ||
        pathname.startsWith("/ai_quicklog") ||
        pathname.startsWith("/ai_supplement") ||
        pathname.startsWith("/routine") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/oauth2")
    )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const hideBottomNav = shouldHideBottomNav(pathname)

    return (
        <>
            <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto">
                {children}
            </div>
            {!hideBottomNav && (
                <Suspense>
                    <BottomNav />
                </Suspense>
            )}
        </>
    )
}
