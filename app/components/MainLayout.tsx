"use client"

import { useEffect, useState } from "react"
import LogViewer from "@/app/components/LogViewer"
import { useAuthStore } from "@/store/authStore"
import { isDemoMode } from "@/utils/demoMode"

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((state) => state.token)
    const [showLogs, setShowLogs] = useState(false)

    useEffect(() => {
        setShowLogs(!!token && isDemoMode())
    }, [token])

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
