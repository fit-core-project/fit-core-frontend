import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { isOnboardingDone, isProfileOnboarded, markOnboardingDone } from "@/lib/api/profile/onboardingFlag"

// Onboarding is complete when the profile has a nickname AND a goal (see isProfileOnboarded).
// equipmentAccess can be empty for existing bodyweight-only users, so it is not part of the check.
// The local "done" flag is per account (JWT subject), so a second account on the same device is still checked.
export function useOnboardingGuard() {
    const router = useRouter()
    const email = useAuthStore((state) => state.user?.email)

    useEffect(() => {
        if (!email) return
        if (isOnboardingDone(email)) return
        let cancelled = false
        profileApiClient
            .getMe()
            .then((profile) => {
                if (cancelled) return
                if (isProfileOnboarded(profile)) {
                    markOnboardingDone(email)
                } else {
                    router.replace("/onboarding")
                }
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [email, router])
}
