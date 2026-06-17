import type {
    Page,
    UserResponse,
    UserUpdateRequest,
    WorkoutSessionResponse,
    WorkoutSetResponse,
    DietLogResponse,
    DietSummaryResponse,
    NutritionTarget,
} from "@/types/project"
import type { RoutineDraft } from "@/types/routine"
import type { UserCondition, UserPreferences } from "@/services/mockDataFactory"

export const DEMO_MODE_STORAGE_KEY = "fitcore_demo_mode"
const DEMO_DATA_VERSION = "2026-05-21-demo-v3"
const DEMO_DATA_VERSION_STORAGE_KEY = "fitcore_demo_data_version"
const DEMO_PROFILE_STORAGE_KEY = "fitcore_demo_profile"
const DEMO_WORKOUTS_STORAGE_KEY = "fitcore_demo_workouts"
export const DEMO_DIETS_STORAGE_KEY = "fitcore_demo_diets"
export const DEMO_NUTRITION_TARGET_STORAGE_KEY = "fitcore_demo_nutrition_target"

export const demoNutritionTarget: NutritionTarget = {
    kcalGoal: 2000,
    proteinGMin: 120,
    proteinGMax: 160,
    carbsGMin: 200,
    carbsGMax: 260,
    fatGMin: 50,
    fatGMax: 70,
}

const allEquipment = ["BARBELL", "DUMBBELL", "MACHINE", "CABLE", "BODYWEIGHT"]
const allAvailableDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

export const demoProfile: UserResponse = {
    userId: "demo-user-001",
    email: "interviewer.demo@fit-core.local",
    name: "Demo User",
    nickname: "테스트 모드",
    profileImageUrl: null,
    gender: "MALE",
    birthDate: "1994-05-21",
    status: "ACTIVE",
    roles: ["ROLE_ADMIN"],
    linkedProviders: ["demo"],
    notes: "면접 시연용으로 모든 초기 데이터가 세팅된 데모 계정입니다.",
    goalType: "hypertrophy",
    splitType: "pushPullLegs",
    experienceLevel: "advanced",
    trainingDaysPerWeek: 5,
    splitLabel: "Push / Pull / Legs",
    bodyWeightKg: 82.4,
    bodyFatPct: 14.8,
    availableDays: allAvailableDays,
    equipmentAccess: allEquipment,
    unpreferredExerciseIds: [],
    preferredExerciseIds: ["bench-press", "squat", "deadlift", "overhead-press"],
    painAreas: [
        { area: "front-deltoids", note: "오버헤드 프레스 고중량 시 불편감" },
        { area: "lower-back", note: "데드리프트 후 피로 누적" },
    ],
    strengthBaseline: [
        { exerciseId: "75", exerciseNameSnapshot: "Barbell Overhead Press", workingWeightKg: 60, reps: 5 },
        { exerciseId: "30", exerciseNameSnapshot: "Barbell Bench Press", workingWeightKg: 100, reps: 5 },
        { exerciseId: "7", exerciseNameSnapshot: "Deadlift", workingWeightKg: 160, reps: 5 },
        { exerciseId: "98", exerciseNameSnapshot: "Back Squat", workingWeightKg: 140, reps: 5 },
    ],
    bodyCompositionSnapshot: [
        {
            measuredAt: "2026-05-20",
            source: "manual",
            sourceVendor: "demo",
            bodyWeightKg: 82.4,
            skeletalMuscleMassKg: 39.1,
            bodyFatMassKg: 12.2,
            bodyFatPct: 14.8,
            fatFreeMassKg: 70.2,
            waistHipRatio: 0.84,
            visceralFatLevel: 5,
        },
        {
            measuredAt: "2026-05-06",
            source: "manual",
            sourceVendor: "demo",
            bodyWeightKg: 82.7,
            skeletalMuscleMassKg: 38.8,
            bodyFatMassKg: 12.6,
            bodyFatPct: 15.2,
            fatFreeMassKg: 70.1,
            waistHipRatio: 0.85,
            visceralFatLevel: 5,
        },
        {
            measuredAt: "2026-04-20",
            source: "manual",
            sourceVendor: "demo",
            bodyWeightKg: 83.1,
            skeletalMuscleMassKg: 38.4,
            bodyFatMassKg: 13.5,
            bodyFatPct: 16.2,
            fatFreeMassKg: 69.6,
            waistHipRatio: 0.86,
            visceralFatLevel: 6,
        },
        {
            measuredAt: "2026-04-06",
            source: "manual",
            sourceVendor: "demo",
            bodyWeightKg: 83.6,
            skeletalMuscleMassKg: 38.0,
            bodyFatMassKg: 14.0,
            bodyFatPct: 16.8,
            fatFreeMassKg: 69.6,
            waistHipRatio: 0.87,
            visceralFatLevel: 6,
        },
        {
            measuredAt: "2026-03-20",
            source: "manual",
            sourceVendor: "demo",
            bodyWeightKg: 84.0,
            skeletalMuscleMassKg: 37.7,
            bodyFatMassKg: 14.7,
            bodyFatPct: 17.5,
            fatFreeMassKg: 69.3,
            waistHipRatio: 0.88,
            visceralFatLevel: 7,
        },
        {
            measuredAt: "2026-03-06",
            source: "manual",
            sourceVendor: "demo",
            bodyWeightKg: 84.5,
            skeletalMuscleMassKg: 37.4,
            bodyFatMassKg: 15.4,
            bodyFatPct: 18.2,
            fatFreeMassKg: 69.1,
            waistHipRatio: 0.89,
            visceralFatLevel: 7,
        },
        {
            measuredAt: "2026-02-20",
            source: "manual",
            sourceVendor: "demo",
            bodyWeightKg: 85.0,
            skeletalMuscleMassKg: 37.0,
            bodyFatMassKg: 16.0,
            bodyFatPct: 18.8,
            fatFreeMassKg: 69.0,
            waistHipRatio: 0.9,
            visceralFatLevel: 8,
        },
    ],
    profileVersion: 1,
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-05-20T09:00:00Z",
}

export const demoUserCondition: UserCondition = {
    doms: { chest: 1, quadriceps: 1 },
    painAreas: demoProfile.painAreas.map((painArea) => painArea.area),
}

const SPLIT_MUSCLES: Record<string, string[]> = {
    push: ["chest", "triceps", "front-deltoids"],
    pull: ["upper-back", "biceps"],
    legs: ["quadriceps", "gluteal", "hamstring"],
    core: ["abs"],
}

export function computeDemoCondition(): UserCondition {
    const sessions = [...demoWorkoutSessions].sort(
        (a, b) => new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime()
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const domsMap: Partial<Record<string, 1 | 2>> = {}

    sessions.forEach((session, index) => {
        // 가장 최근 세션을 어제로 간주, 이후는 2일 간격으로 처리
        const daysAgo = index + 1
        if (daysAgo >= 2) return

        const splitKey = (session.targetSplitLabel ?? "").toLowerCase()
        const muscles = SPLIT_MUSCLES[splitKey] ?? []
        const level: 1 | 2 = daysAgo === 0 ? 2 : 1
        muscles.forEach((m) => {
            if (!(m in domsMap)) domsMap[m] = level
        })
    })

    return {
        doms: domsMap,
        painAreas: getDemoProfile().painAreas.map((p) => p.area),
    }
}

export const demoUserPreferences: UserPreferences = {
    timeAvailable: 75,
    goal: demoProfile.goalType,
    equipment: allEquipment,
    weeklyFrequency: demoProfile.trainingDaysPerWeek,
    splitPreference: demoProfile.splitType,
    strengthBaseline: {
        benchPress: 100,
        squat: 140,
        deadlift: 160,
        overheadPress: 60,
    },
}

const workoutSet = (
    id: string,
    exerciseOrder: number,
    exerciseId: string,
    exerciseNameSnapshot: string,
    setIndex: number,
    weightKg: number,
    reps: number,
    rpe: number,
    restSec: number
): WorkoutSetResponse => ({
    id,
    exerciseOrder,
    exerciseId,
    exerciseNameSnapshot,
    setIndex,
    setType: "working",
    trackingMode: "weightReps",
    weightKg,
    reps,
    rpe,
    rir: 10 - rpe,
    isFailure: false,
    restSec,
    setNote: "",
})

export const demoWorkoutSessions: WorkoutSessionResponse[] = [
    {
        id: "demo-workout-001",
        userId: demoProfile.userId,
        workoutDate: "2026-05-18",
        splitLabel: "Push - 흉근/삼두",
        routineName: "상부 흉근 볼륨업 루틴",
        targetSplitLabel: "push",
        sourceRoutineFinalId: "demo-final-001",
        timeAvailableMin: 75,
        durationMin: 68,
        readinessLevel: "normal",
        currentPainAreas: ["front-deltoids"],
        currentDoms: [{ bodyPart: "chest", level: "mild" }],
        unavailableEquipment: [],
        sessionNote: "",
        createdAt: "2026-05-18T10:00:00Z",
        updatedAt: "2026-05-18T11:08:00Z",
        sets: [
            workoutSet("demo-set-001", 1, "bench-press", "Bench Press", 1, 90, 6, 7, 180),
            workoutSet("demo-set-002", 1, "bench-press", "Bench Press", 2, 100, 5, 8, 180),
            workoutSet("demo-set-003", 1, "bench-press", "Bench Press", 3, 100, 5, 9, 180),
            workoutSet("demo-set-004", 2, "incline-dumbbell-press", "Incline Dumbbell Press", 1, 30, 10, 8, 90),
        ],
    },
    {
        id: "demo-workout-002",
        userId: demoProfile.userId,
        workoutDate: "2026-05-16",
        splitLabel: "Legs - 스쿼트 중심",
        routineName: "스쿼트 중심 하체 근비대 루틴",
        targetSplitLabel: "legs",
        sourceRoutineFinalId: "demo-final-002",
        timeAvailableMin: 75,
        durationMin: 72,
        readinessLevel: "normal",
        currentPainAreas: ["lower-back"],
        currentDoms: [],
        unavailableEquipment: [],
        sessionNote: "",
        createdAt: "2026-05-16T10:00:00Z",
        updatedAt: "2026-05-16T11:12:00Z",
        sets: [
            workoutSet("demo-set-005", 1, "squat", "Squat", 1, 120, 5, 7, 180),
            workoutSet("demo-set-006", 1, "squat", "Squat", 2, 140, 5, 8, 180),
            workoutSet("demo-set-007", 1, "squat", "Squat", 3, 140, 4, 9, 180),
            workoutSet("demo-set-008", 2, "leg-press", "Leg Press", 1, 180, 10, 8, 120),
        ],
    },
    {
        id: "demo-workout-003",
        userId: demoProfile.userId,
        workoutDate: "2026-05-14",
        splitLabel: "Pull - 등/이두",
        routineName: "등 후면사슬 강화 루틴",
        targetSplitLabel: "pull",
        sourceRoutineFinalId: "demo-final-003",
        timeAvailableMin: 60,
        durationMin: 55,
        readinessLevel: "normal",
        currentPainAreas: [],
        currentDoms: [],
        unavailableEquipment: [],
        sessionNote: "",
        createdAt: "2026-05-14T10:00:00Z",
        updatedAt: "2026-05-14T10:55:00Z",
        sets: [
            workoutSet("demo-set-009", 1, "deadlift", "Deadlift", 1, 140, 5, 7, 180),
            workoutSet("demo-set-010", 1, "deadlift", "Deadlift", 2, 160, 4, 9, 180),
            workoutSet("demo-set-011", 2, "lat-pulldown", "Lat Pulldown", 1, 65, 10, 8, 90),
            workoutSet("demo-set-012", 3, "barbell-row", "Barbell Row", 1, 80, 8, 8, 120),
        ],
    },
]

export const demoRoutineDraft: RoutineDraft = {
    routineDraftId: "demo-draft-001",
    generationStatus: "success",
    statusReasonCode: "none",
    isFallback: false,
    totalEstimatedTime: 75,
    summaryTitle: "데모 Push 루틴",
    rationaleSummary: [
        "근비대 목적과 벤치프레스 기준 중량을 반영했습니다.",
        "front-deltoids 불편감을 고려해 오버헤드성 볼륨은 낮췄습니다.",
    ],
    warnings: ["전면 삼각근 통증이 있으면 프레스 각도를 낮추세요."],
    routineBlocks: [
        {
            order: 1,
            exerciseId: "bench-press",
            exerciseName: "Bench Press",
            exerciseRationale: "주요 근비대 자극과 기준 중량 확인을 위한 메인 리프트입니다.",
            prescription: [
                {
                    setIndex: 1,
                    setType: "working",
                    targetReps: 6,
                    targetWeightKg: 90,
                    targetRir: 3,
                    targetRestSec: 180,
                },
                {
                    setIndex: 2,
                    setType: "working",
                    targetReps: 5,
                    targetWeightKg: 100,
                    targetRir: 2,
                    targetRestSec: 180,
                },
                {
                    setIndex: 3,
                    setType: "working",
                    targetReps: 5,
                    targetWeightKg: 100,
                    targetRir: 2,
                    targetRestSec: 180,
                },
            ],
        },
        {
            order: 2,
            exerciseId: "incline-dumbbell-press",
            exerciseName: "Incline Dumbbell Press",
            exerciseRationale: "전면 삼각근 부담을 관리하며 상부 흉근 볼륨을 확보합니다.",
            prescription: [
                {
                    setIndex: 1,
                    setType: "working",
                    targetReps: 10,
                    targetWeightKg: 28,
                    targetRir: 3,
                    targetRestSec: 90,
                },
                {
                    setIndex: 2,
                    setType: "working",
                    targetReps: 10,
                    targetWeightKg: 30,
                    targetRir: 2,
                    targetRestSec: 90,
                },
                { setIndex: 3, setType: "working", targetReps: 8, targetWeightKg: 30, targetRir: 2, targetRestSec: 90 },
            ],
        },
    ],
}

const _kstOffset = 9 * 60 * 60 * 1000
const _today = new Date(Date.now() + _kstOffset).toISOString().slice(0, 10)
const _yesterday = new Date(Date.now() + _kstOffset - 86400000).toISOString().slice(0, 10)

export const demoDietLogs: DietLogResponse[] = [
    {
        id: "demo-diet-001",
        logDate: _today,
        mealType: "breakfast",
        loggedAt: `${_today}T07:30:00`,
        foodName: "잡곡밥",
        amountG: 210,
        amountRaw: "1공기",
        kcal: 315,
        proteinG: 6.5,
        carbsG: 68.0,
        fatG: 1.5,
        source: "db",
    },
    {
        id: "demo-diet-002",
        logDate: _today,
        mealType: "breakfast",
        loggedAt: `${_today}T07:32:00`,
        foodName: "삶은 달걀",
        amountG: 100,
        amountRaw: "2개",
        kcal: 155,
        proteinG: 13.0,
        carbsG: 1.1,
        fatG: 11.0,
        source: "db",
    },
    {
        id: "demo-diet-003",
        logDate: _today,
        mealType: "lunch",
        loggedAt: `${_today}T12:15:00`,
        foodName: "닭가슴살",
        amountG: 150,
        amountRaw: null,
        kcal: 165,
        proteinG: 35.0,
        carbsG: 0.0,
        fatG: 2.0,
        source: "manual",
    },
    {
        id: "demo-diet-004",
        logDate: _today,
        mealType: "lunch",
        loggedAt: `${_today}T12:17:00`,
        foodName: "고구마",
        amountG: 130,
        amountRaw: "중간 크기 1개",
        kcal: 116,
        proteinG: 1.6,
        carbsG: 27.4,
        fatG: 0.1,
        source: "db",
    },
    {
        id: "demo-diet-005",
        logDate: _yesterday,
        mealType: "lunch",
        loggedAt: `${_yesterday}T12:00:00`,
        foodName: "현미밥",
        amountG: 200,
        amountRaw: "1공기",
        kcal: 290,
        proteinG: 5.0,
        carbsG: 62.0,
        fatG: 1.2,
        source: "db",
    },
    {
        id: "demo-diet-006",
        logDate: _yesterday,
        mealType: "dinner",
        loggedAt: `${_yesterday}T19:00:00`,
        foodName: "연어 스테이크",
        amountG: 200,
        amountRaw: null,
        kcal: 412,
        proteinG: 40.0,
        carbsG: 0.0,
        fatG: 27.0,
        source: "manual",
    },
]

const readJson = <T>(key: string, fallback: T): T => {
    if (typeof window === "undefined") return fallback

    try {
        const raw = localStorage.getItem(key)
        return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
        return fallback
    }
}

const writeJson = (key: string, value: unknown) => {
    if (typeof window === "undefined") return
    localStorage.setItem(key, JSON.stringify(value))
}

export function isDemoMode(): boolean {
    return typeof window !== "undefined" && localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true"
}

export function createDemoToken(): string {
    const encode = (value: unknown) =>
        btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")

    const now = Math.floor(Date.now() / 1000)
    return [
        encode({ alg: "none", typ: "JWT" }),
        encode({
            sub: demoProfile.email,
            auth: "ROLE_ADMIN",
            profileImage: demoProfile.profileImageUrl,
            iat: now,
            exp: now + 60 * 60 * 24 * 30,
            demo: true,
        }),
        "demo",
    ].join(".")
}

export function seedDemoSession() {
    if (typeof window === "undefined") return

    localStorage.setItem(DEMO_MODE_STORAGE_KEY, "true")
    localStorage.setItem(DEMO_DATA_VERSION_STORAGE_KEY, DEMO_DATA_VERSION)
    writeJson(DEMO_PROFILE_STORAGE_KEY, demoProfile)
    writeJson(DEMO_WORKOUTS_STORAGE_KEY, demoWorkoutSessions)
    writeJson(DEMO_DIETS_STORAGE_KEY, demoDietLogs)
    writeJson(DEMO_NUTRITION_TARGET_STORAGE_KEY, demoNutritionTarget)
    writeJson("fitcore_doms_data", demoUserCondition.doms)
    writeJson("fitcore_pain_areas", demoUserCondition.painAreas)
    writeJson("fitcore_active_routine", demoRoutineDraft)
    localStorage.setItem("fitcore_split_label", demoRoutineDraft.summaryTitle)
    localStorage.removeItem("fitcore_unavailable_equipment")
    localStorage.removeItem("fitcore_failed_workout_save")
}

export function clearDemoSession() {
    if (typeof window === "undefined") return

    localStorage.removeItem(DEMO_MODE_STORAGE_KEY)
    localStorage.removeItem(DEMO_DATA_VERSION_STORAGE_KEY)
    localStorage.removeItem(DEMO_PROFILE_STORAGE_KEY)
    localStorage.removeItem(DEMO_WORKOUTS_STORAGE_KEY)
    localStorage.removeItem(DEMO_DIETS_STORAGE_KEY)
    localStorage.removeItem(DEMO_NUTRITION_TARGET_STORAGE_KEY)
    localStorage.removeItem("fitcore_doms_data")
    localStorage.removeItem("fitcore_pain_areas")
    localStorage.removeItem("fitcore_active_routine")
    localStorage.removeItem("fitcore_split_label")
    localStorage.removeItem("fitcore_unavailable_equipment")
    localStorage.removeItem("fitcore_failed_workout_save")
}

export function getDemoProfile(): UserResponse {
    if (typeof window !== "undefined" && localStorage.getItem(DEMO_DATA_VERSION_STORAGE_KEY) !== DEMO_DATA_VERSION) {
        seedDemoSession()
    }

    return readJson(DEMO_PROFILE_STORAGE_KEY, demoProfile)
}

export function updateDemoProfile(request: UserUpdateRequest): UserResponse {
    const updated = { ...getDemoProfile(), ...request, updatedAt: new Date().toISOString() }
    writeJson(DEMO_PROFILE_STORAGE_KEY, updated)
    if (request.painAreas !== undefined) {
        writeJson("fitcore_pain_areas", updated.painAreas.map((p) => p.area))
    }
    return updated
}

export function getDemoRecentWorkouts(page: number = 0, size: number = 10): Page<WorkoutSessionResponse> {
    if (typeof window !== "undefined" && localStorage.getItem(DEMO_DATA_VERSION_STORAGE_KEY) !== DEMO_DATA_VERSION) {
        seedDemoSession()
    }

    const workouts = readJson(DEMO_WORKOUTS_STORAGE_KEY, demoWorkoutSessions)
    const start = page * size
    const content = workouts.slice(start, start + size)
    const totalPages = Math.max(1, Math.ceil(workouts.length / size))

    return {
        content,
        last: page >= totalPages - 1,
        totalPages,
        totalElements: workouts.length,
        size,
        number: page,
        first: page === 0,
        numberOfElements: content.length,
        empty: content.length === 0,
    }
}

export function getDemoDietLogs(date: string): DietLogResponse[] {
    if (typeof window !== "undefined" && localStorage.getItem(DEMO_DATA_VERSION_STORAGE_KEY) !== DEMO_DATA_VERSION) {
        seedDemoSession()
    }
    const all = readJson<DietLogResponse[]>(DEMO_DIETS_STORAGE_KEY, demoDietLogs)
    return all.filter((l) => l.logDate === date)
}

export function updateDemoDiet(id: string, updated: DietLogResponse): void {
    if (typeof window === "undefined") return
    const all = readJson<DietLogResponse[]>(DEMO_DIETS_STORAGE_KEY, demoDietLogs)
    writeJson(DEMO_DIETS_STORAGE_KEY, all.map((l) => (l.id === id ? updated : l)))
}

export function deleteDemoDiet(id: string): void {
    if (typeof window === "undefined") return
    const all = readJson<DietLogResponse[]>(DEMO_DIETS_STORAGE_KEY, demoDietLogs)
    writeJson(DEMO_DIETS_STORAGE_KEY, all.filter((l) => l.id !== id))
}

export function getDemoDietSummary(date: string): DietSummaryResponse {
    const logs = getDemoDietLogs(date)
    const sorted = [...logs].sort((a, b) => {
        if (!a.loggedAt && !b.loggedAt) return 0
        if (!a.loggedAt) return 1
        if (!b.loggedAt) return -1
        return a.loggedAt.localeCompare(b.loggedAt)
    })
    const totalKcal = sorted.reduce((sum, l) => sum + l.kcal, 0)
    const totalProteinG = Math.round(sorted.reduce((sum, l) => sum + (l.proteinG ?? 0), 0) * 10) / 10
    const totalCarbsG = Math.round(sorted.reduce((sum, l) => sum + (l.carbsG ?? 0), 0) * 10) / 10
    const totalFatG = Math.round(sorted.reduce((sum, l) => sum + (l.fatG ?? 0), 0) * 10) / 10
    return { date, totalKcal, totalProteinG, totalCarbsG, totalFatG, items: sorted }
}
