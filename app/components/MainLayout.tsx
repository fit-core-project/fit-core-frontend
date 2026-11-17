"use client"

import { useSyncExternalStore } from "react"
import dynamic from "next/dynamic"
import { useAuthStore } from "@/store/authStore"
import { isDemoMode } from "@/utils/demoMode"
import OnboardingGate from "@/components/OnboardingGate"
import OfflineBanner from "@/components/OfflineBanner"

// In production builds, NODE_ENV is inlined to 'production' by webpack,
// making the dynamic import dead code that is eliminated from the bundle.
const IS_PROD = process.env.NODE_ENV === "production"
const SHOW_DEV_LOGS = process.env.NEXT_PUBLIC_SHOW_DEV_LOGS === "true"

const LogViewer = IS_PROD
    ? () => null
    : dynamic(() => import("@/app/components/LogViewer"), { ssr: false })

const subscribeNever = () => () => {}

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((state) => state.token)
    // Dev log panels: opt-in (NEXT_PUBLIC_SHOW_DEV_LOGS=true) and decided after mount. Reading
    // localStorage (isDemoMode) during render made the server and client trees differ, and the lazily
    // compiled panel chunk kept the dev server's HMR refreshing demo pages on a full load.
    const demoReady = useSyncExternalStore(subscribeNever, isDemoMode, () => false)
    const showLogs = !IS_PROD && SHOW_DEV_LOGS && !!token && demoReady

    return (
        <main className="flex h-full w-full justify-center overflow-hidden">
            <OnboardingGate />
            <OfflineBanner />
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
