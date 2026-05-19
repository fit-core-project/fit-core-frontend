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
    strengthBaseline: StrengthBaseline[]

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
    strengthBaseline?: StrengthBaseline[]
    bodyCompositionSnapshot?: BodyComposition[]
}

export interface PainArea {
    area: string
    note: string
}

export interface StrengthBaseline {
    exerciseId: string
    exerciseNameSnapshot: string
    workingWeightKg: number
    reps: number
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

export interface Page<T> {
    content: T[]
    last: boolean
    totalPages: number
    totalElements: number
    size: number
    number: number
    first: boolean
    numberOfElements: number
    empty: boolean
}

export interface Doms {
    bodyPart?: string
    level?: string
}

export interface WorkoutSetResponse {
    id: string
    exerciseOrder: number
    exerciseId: string
    exerciseNameSnapshot: string
    setIndex: number
    setType: "working" | "warmup" | "drop" | "failure" // 서버의 Enum이나 문자열 값에 맞춤
    trackingMode: string
    weightKg: number // BigDecimal -> number
    reps: number
    rpe: number // BigDecimal -> number
    rir: number // BigDecimal -> number
    isFailure: boolean
    restSec: number
    setNote: string
}

export interface WorkoutSessionResponse {
    id: string
    userId: string
    workoutDate: string | Date // ISO 8601 Date (YYYY-MM-DD)
    splitLabel: string
    sourceRoutineFinalId: string
    timeAvailableMin: number // Short -> number
    durationMin: number
    readinessLevel: string

    // JSON 필드 (배열 처리)
    currentPainAreas: string[]
    currentDoms: Doms[]
    unavailableEquipment: string[]

    sessionNote: string
    createdAt: string | Date // ISO 8601 DateTime
    updatedAt: string | Date

    // 연관된 세트 리스트
    sets: WorkoutSetResponse[]
}
