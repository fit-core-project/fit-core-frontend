"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const user = useAuthStore((state) => state.user)
    const isLoading = useAuthStore((state) => state.isLoading)

    useEffect(() => {
        if (isLoading) return
        if (!user || !user.role?.includes("ROLE_ADMIN")) {
            router.replace("/")
        }
    }, [user, isLoading, router])

    if (isLoading || !user?.role?.includes("ROLE_ADMIN")) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="animate-pulse text-slate-500">권한 확인 중...</p>
            </div>
        )
    }

    return <>{children}</>
}
