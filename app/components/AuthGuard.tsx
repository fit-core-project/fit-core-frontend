"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"

const PUBLIC_PATHS = ["/login", "/oauth2/redirect"]

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((s) => s.token)
    const isLoading = useAuthStore((s) => s.isLoading)
    const pathname = usePathname()
    const router = useRouter()

    const isPublic = isPublicPath(pathname)
    const isAuthenticated = !!token

    useEffect(() => {
        if (isLoading) return
        if (!isPublic && !isAuthenticated) {
            router.replace("/login")
        }
    }, [isLoading, isPublic, isAuthenticated, router])

    // Public routes always render regardless of auth state
    if (isPublic) return <>{children}</>

    // Wait for Zustand persist rehydration + AuthInitializer to complete
    // Render a neutral background to avoid white flash
    if (isLoading) {
        return <div className="flex-1 bg-slate-50" aria-hidden />
    }

    // Not authenticated on protected route — redirect firing, render nothing
    if (!isAuthenticated) return null

    return <>{children}</>
}
