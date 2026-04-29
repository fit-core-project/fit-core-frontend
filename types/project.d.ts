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

    bodyCompositionSnapshot?: BodyComposition[]
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
    painAreas?: PainArea[]
    strengthBaseline?: Record<string, unknown>
    bodyCompositionSnapshot?: BodyComposition[]
}

export interface PainArea {
    area: string
    note: string
}

export interface BodyComposition {
    /** YYYY-MM-DD 형식 */
    measuredAt?: string
    source?: string
    sourceVendor?: string
    bodyWeightKg?: number
    skeletalMuscleMassKg?: number
    bodyFatMassKg?: number
    bodyFatPct?: number
    fatFreeMassKg?: number
    waistHipRatio?: number
    visceralFatLevel?: number
}
