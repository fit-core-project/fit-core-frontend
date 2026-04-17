export interface UserResponse {
    userId?: number
    email: string
    name?: string | null
    nickname?: string | null
    profileImageUrl?: string | null
    gender?: Gender
    birthDate?: Date | string | null
    status?: UserStatus
    roles: UserRole[]
    linkedProviders?: string[]
    createdAt?: Date | string
    updatedAt?: Date | string
}

export interface UserUpdateRequest {
    nickname?: string | null
    profileImageUrl?: string | null
    gender?: Gender
}
