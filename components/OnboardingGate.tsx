"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { isOnboardingDone, isProfileOnboarded, markOnboardingDone } from "@/lib/api/profile/onboardingFlag"
import { isOnboardingGuardedPath } from "@/lib/axios/authRedirect"
import { isDemoMode } from "@/utils/demoMode"

/**
 * Global onboarding guard: a signed-in account that has not finished onboarding is sent to
 * /onboarding from home and every protected app route (see isOnboardingGuardedPath).
 * Waits for AuthInitializer (isLoading) so it never runs before the session (or MSW) is ready.
 * Demo mode is skipped: the demo profile is always onboarded.
 */
export default function OnboardingGate() {
    const pathname = usePathname()
    const token = useAuthStore((s) => s.token)
    const isLoading = useAuthStore((s) => s.isLoading)
    const email = useAuthStore((s) => s.user?.email)

    const active = !isLoading && Boolean(token) && Boolean(email) && isOnboardingGuardedPath(pathname) && !isDemoMode()
    // Remounts when the user enters a guarded route again (e.g. leaves /onboarding unfinished).
    return active && email ? <OnboardingCheck email={email} /> : null
}

function OnboardingCheck({ email }: { email: string }) {
    const router = useRouter()

    useEffect(() => {
        if (isOnboardingDone(email)) return
        let cancelled = false
        profileApiClient
            .getMe()
            .then((profile) => {
                if (cancelled) return
                if (isProfileOnboarded(profile)) markOnboardingDone(email)
                else router.replace("/onboarding")
            })
            .catch(() => {
                // Network or auth errors: stay on the page; the auth layer handles 401.
            })
        return () => {
            cancelled = true
        }
    }, [email, router])

    return null
}
