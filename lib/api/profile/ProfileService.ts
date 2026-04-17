import AxiosController from "@/lib/axios/AxiosController"
import { UserResponse, UserUpdateRequest } from "@/types/project"

const prefixUri = `/api/v1/user`

const getMyProfile = (email: string) => AxiosController.get<UserResponse>(prefixUri + `/my/${email}`)

const updateMyProfile = (email: string, userUpdateRequest: UserUpdateRequest) =>
    AxiosController.put<UserResponse>(prefixUri + `/my/${email}`, userUpdateRequest)

const checkNicknameDuplicate = (nickname: string) =>
    AxiosController.get<boolean>(prefixUri + `/check-nickname/${nickname}`)

export default {
    getMyProfile,
    updateMyProfile,
    checkNicknameDuplicate,
}
