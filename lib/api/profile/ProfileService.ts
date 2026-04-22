import AxiosController from "@/lib/axios/AxiosController"
import { UserResponse, UserUpdateRequest } from "@/types/project"

const prefixUri = `/api/profile`

const getMyProfile = () => AxiosController.get<UserResponse>(prefixUri + `/me`)

const updateMyProfile = (userUpdateRequest: UserUpdateRequest) =>
    AxiosController.put<UserResponse>(prefixUri + `/me`, userUpdateRequest)

const checkNicknameDuplicate = (nickname: string) =>
    AxiosController.get<boolean>(prefixUri + `/check-nickname/${nickname}`)

export default {
    getMyProfile,
    updateMyProfile,
    checkNicknameDuplicate,
}
