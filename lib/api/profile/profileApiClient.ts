import AxiosController from "@/lib/axios/AxiosController"
import { UserResponse, UserUpdateRequest } from "@/types/project"

const profileApiClient = {
    getMe: (): Promise<UserResponse> =>
        AxiosController.get<UserResponse>("/api/profile/me"),

    updateMe: (request: UserUpdateRequest): Promise<UserResponse> =>
        AxiosController.put<UserResponse>("/api/profile/me", request),

    checkNickname: (nickname: string): Promise<boolean> =>
        AxiosController.get<boolean>(`/api/profile/check-nickname/${nickname}`),
}

export default profileApiClient
