import AxiosController from "@/lib/axios/AxiosController"
import { UserResponse, UserUpdateRequest } from "@/types/project"
import { guardProfileResponse } from "@/utils/responseGuard"
import { getDemoProfile, isDemoMode, updateDemoProfile } from "@/utils/demoMode"

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

    checkNickname: (nickname: string): Promise<boolean> => {
        if (isDemoMode()) return Promise.resolve(nickname !== getDemoProfile().nickname)
        return AxiosController.get<boolean>(`/api/profile/check-nickname/${nickname}`)
    },

    setLinkMode: (): Promise<void> =>
        AxiosController.post("/api/v1/auth/set-link-mode"),
}

export default profileApiClient
