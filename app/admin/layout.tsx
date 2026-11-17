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
        // Logged out: the route guard (AuthProvider) sends to /login with a return path.
        if (user && !user.role?.includes("ROLE_ADMIN")) {
            router.replace("/")
        }
    }, [user, isLoading, router])

    if (isLoading || !user?.role?.includes("ROLE_ADMIN")) {
        return (
            <div className="flex flex-1 items-center justify-center bg-ground px-4 py-12">
                <p role="status" className="text-body text-ink-2 motion-safe:animate-pulse">권한을 확인하고 있어요</p>
            </div>
        )
    }

    return <>{children}</>
}
