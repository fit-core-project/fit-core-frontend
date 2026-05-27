"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useAuthStore } from "@/store/authStore"
import { isDemoMode } from "@/utils/demoMode"

// In production builds, NODE_ENV is inlined to 'production' by webpack,
// making the dynamic import dead code that is eliminated from the bundle.
const IS_PROD = process.env.NODE_ENV === "production"

const LogViewer = IS_PROD
    ? () => null
    : dynamic(() => import("@/app/components/LogViewer"), { ssr: false })

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((state) => state.token)
    const [isDemoActive, setIsDemoActive] = useState(false)

    useEffect(() => {
        setIsDemoActive(!IS_PROD && !!token && isDemoMode())
    }, [token])

    const showLogs = isDemoActive

    return (
        <main className="flex h-full w-full justify-center overflow-hidden">
            {showLogs && (
                <LogViewer
                    title="AI Engine Logs"
                    endpoint={process.env.NEXT_PUBLIC_API_URL}
                    accentClassName="bg-emerald-400"
                />
            )}
            {children}
            {showLogs && (
                <LogViewer
                    title="Spring Boot Logs"
                    endpoint={process.env.NEXT_PUBLIC_BASE_URL}
                    accentClassName="bg-sky-400"
                />
            )}
        </main>
    )
}
