import AxiosController from "@/lib/axios/AxiosController"
import { UserResponse, UserUpdateRequest } from "@/types/project"
import { guardProfileResponse } from "@/utils/responseGuard"
import { clearDemoSession, getDemoProfile, isDemoMode, updateDemoProfile } from "@/utils/demoMode"

const profileApiClient = {
    getMe: async (): Promise<UserResponse> => {
        if (isDemoMode()) return getDemoProfile()

        const data = await AxiosController.get<unknown>("/api/profile/me")
        guardProfileResponse(data)
        return data
    },

    updateMe: async (request: UserUpdateRequest): Promise<UserResponse> => {
        if (isDemoMode()) return updateDemoProfile(request)

        const data = await AxiosController.put<unknown>("/api/profile/me", request)
        guardProfileResponse(data)
        return data
    },

    /**
     * 회원 탈퇴 (DELETE /api/profile/me, 204). The caller logs out afterwards.
     * Demo mode has no server account, so it only clears the demo session.
     */
    withdraw: async (): Promise<void> => {
        if (isDemoMode()) {
            clearDemoSession()
            return
        }
        await AxiosController.delete("/api/profile/me")
    },

    /** true when another account already uses the nickname (BE `/check-nickname` returns isDuplicate). */
    isNicknameTaken: (nickname: string): Promise<boolean> => {
        // Demo mode has no other accounts, so no nickname is taken.
        if (isDemoMode()) return Promise.resolve(false)
        return AxiosController.get<boolean>(`/api/profile/check-nickname/${encodeURIComponent(nickname)}`)
    },

    setLinkMode: (): Promise<void> =>
        AxiosController.post("/api/v1/auth/set-link-mode"),
}

export default profileApiClient
