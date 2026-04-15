export interface UserResponse {
    userId?: number
    email: string
    name?: string | null
    nickname?: string | null
    profileImageUrl?: string | null
    gender?: Gender | null // 여기서 정의된 타입을 사용
    birthDate?: Date | string | null
    status?: UserStatus
    roles: UserRole[]
    createdAt?: Date | string
    updatedAt?: Date | string
}
