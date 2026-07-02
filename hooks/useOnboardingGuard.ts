import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import profileApiClient from "@/lib/api/profile/profileApiClient"

// Use nickname as the new-user signal.
// equipmentAccess can be empty for existing bodyweight-only users,
// so it must not be used as the primary onboarding redirect condition.
export function useOnboardingGuard() {
    const router = useRouter()
    const user = useAuthStore((state) => state.user)

    useEffect(() => {
        if (!user?.email) return
        if (typeof window !== "undefined" && localStorage.getItem("fitcore_onboarding_done") === "1") return
        profileApiClient
            .getMe()
            .then((profile) => {
                if (!profile.nickname?.trim()) {
                    router.replace("/onboarding")
                }
            })
            .catch(() => {})
    }, [user, router])
}
