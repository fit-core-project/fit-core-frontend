import { Gender, UserStatus, UserRole, GoalType, SplitType, ExperienceLevel } from "./enums"

export interface UserResponse {
    // 식별 및 기본 정보
    userId: string // UUID는 JSON에서 string으로 전달됨
    email: string
    name: string | null
    nickname: string | null
    profileImageUrl: string | null
    gender: Gender
    birthDate: string | null // "YYYY-MM-DD"
    status: UserStatus
    roles: UserRole[]
    linkedProviders?: string[]
    notes: string
    // 피트니스 상세 정보
    goalType: GoalType
    splitType: SplitType
    experienceLevel: ExperienceLevel
    trainingDaysPerWeek: number
    splitLabel: string | null
    bodyWeightKg: number
    bodyFatPct: number

    // JSON 매핑 필드
    availableDays: string[]
    equipmentAccess: string[]
    unpreferredExerciseIds: string[]
    preferredExerciseIds: string[]
    painAreas: PainArea[] // List<Map<String, Object>> 매핑
    strengthBaseline: Record<string, unknown> // Map<String, Object> 매핑

    profileVersion: number
    createdAt?: string
    updatedAt?: string
}

export interface UserUpdateRequest {
    // 수정 가능한 정보만 포함
    nickname?: string
    gender?: Gender
    birthDate?: string

    // 피트니스 정보
    goalType?: GoalType
    splitType?: SplitType
    experienceLevel?: ExperienceLevel
    trainingDaysPerWeek?: number
    splitLabel?: string
    bodyWeightKg?: number
    bodyFatPct?: number

    // JSON 필드
    availableDays?: string[]
    equipmentAccess?: string[]
    unpreferredExerciseIds?: string[]
    preferredExerciseIds?: string[]
    painAreas?: Record<string, unknown>[]
    strengthBaseline?: Record<string, unknown>
}

export interface PainArea {
    area: string
    painLevel: string
    note: string
}
