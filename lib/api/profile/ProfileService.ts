import AxiosController from "@/lib/axios/AxiosController"
import { UserResponse } from "@/types/project"

const prefixUri = `/api/v1/user`

const getMyProfile = (email: string) => AxiosController.get<UserResponse>(prefixUri + `/my/${email}`)

export default {
    getMyProfile,
}
