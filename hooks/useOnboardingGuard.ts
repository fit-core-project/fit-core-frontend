import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import profileApiClient from "@/lib/api/profile/profileApiClient"

export function useOnboardingGuard() {
    const router = useRouter()
    const user = useAuthStore((state) => state.user)

    useEffect(() => {
        if (!user?.email) return
        if (typeof window !== "undefined" && localStorage.getItem("fitcore_onboarding_done") === "1") return
        profileApiClient
            .getMe()
            .then((profile) => {
                if ((profile.equipmentAccess ?? []).length === 0) {
                    router.replace("/onboarding")
                }
            })
            .catch(() => {})
    }, [user, router])
}
