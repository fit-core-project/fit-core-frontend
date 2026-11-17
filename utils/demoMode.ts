import type {
    Page,
    UserResponse,
    UserUpdateRequest,
    WorkoutSessionResponse,
    DietDailyAggregationResponse,
    DietLogResponse,
    DietSummaryResponse,
    NutritionTarget,
} from "@/types/project"
import type { RoutineDraft, RoutineFinalResponse } from "@/types/routine"
import type { UserCondition, UserPreferences } from "@/services/mockDataFactory"
import { aggregateDietLogs } from "@/utils/dietAggregation"
import { getKstToday } from "@/utils/date"
import {
    DEMO_HISTORY_DAYS,
    DEMO_USER_ID,
    addDays,
    buildDemoBodyComposition,
    buildDemoDietLogs,
    buildDemoFinals,
    buildDemoWorkouts,
    demoDomsFromSessions,
} from "@/utils/demoSeed"

export const DEMO_MODE_STORAGE_KEY = "fitcore_demo_mode"
/** Bump whenever the seed changes: a browser holding another version reseeds on its next demo read. */
export const DEMO_DATA_VERSION = "2026-11-17-demo-v5"
const DEMO_DATA_VERSION_STORAGE_KEY = "fitcore_demo_data_version"
const DEMO_PROFILE_STORAGE_KEY = "fitcore_demo_profile"
const DEMO_WORKOUTS_STORAGE_KEY = "fitcore_demo_workouts"
export const DEMO_DIETS_STORAGE_KEY = "fitcore_demo_diets"
export const DEMO_NUTRITION_TARGET_STORAGE_KEY = "fitcore_demo_nutrition_target"
/** Saved routines (RoutineFinalResponse[], newest first) the demo reads instead of /api/routines/finals. */
export const DEMO_ROUTINE_FINALS_STORAGE_KEY = "fitcore_demo_routine_finals"
/** Routine programs the demo keeps instead of /api/programs (see utils/demoProgramStore). */
export const DEMO_PROGRAMS_STORAGE_KEY = "fitcore_demo_programs"

export const demoNutritionTarget: NutritionTarget = {
    kcalGoal: 2000,
    proteinGMin: 120,
    proteinGMax: 160,
    carbsGMin: 200,
    carbsGMax: 260,
    fatGMin: 50,
    fatGMax: 70,
    sugarMax: 50,
    fiberMin: 25,
    sodiumMax: 2000,
}

const allEquipment = ["BARBELL", "DUMBBELL", "MACHINE", "CABLE", "BODYWEIGHT"]
const allAvailableDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

/** Demo profile with its body-composition history relative to `today` (KST YYYY-MM-DD). */
export function buildDemoProfile(today: string = getKstToday()): UserResponse {
    const bodyCompositionSnapshot = buildDemoBodyComposition(today)
    const latest = bodyCompositionSnapshot[0]
    return {
        userId: DEMO_USER_ID,
        email: "interviewer.demo@fit-core.local",
        name: "Demo User",
        nickname: "테스트 모드",
        profileImageUrl: null,
        gender: "MALE",
        birthDate: "1994-05-21",
        status: "ACTIVE",
        roles: [process.env.NEXT_PUBLIC_DEMO_ADMIN === "true" ? "ROLE_ADMIN" : "ROLE_USER"],
        linkedProviders: ["demo"],
        notes: "면접 시연용 데모 계정입니다. 최근 6주 운동, 2주 식단, 체성분 기록이 오늘 기준으로 채워져 있어요.",
        goalType: "hypertrophy",
        splitType: "pushPullLegs",
        experienceLevel: "advanced",
        trainingDaysPerWeek: 4,
        splitLabel: "Push / Pull / Legs",
        bodyWeightKg: latest.bodyWeightKg ?? 82.5,
        bodyFatPct: latest.bodyFatPct ?? 14.9,
        availableDays: allAvailableDays,
        equipmentAccess: allEquipment,
        unpreferredExerciseIds: [],
        // ids from the mock catalog (getMockExerciseCatalog): 벤치프레스, 스쿼트, 데드리프트, 바벨로우
        preferredExerciseIds: ["ex_1", "ex_2", "ex_3", "ex_7"],
        painAreas: [
            { area: "front-deltoids", note: "오버헤드 프레스 고중량 시 불편감" },
            { area: "lower-back", note: "데드리프트 후 피로 누적" },
        ],
        // ids fixed by WorkoutSettingsSection (the strength-baseline editor), not the mock catalog
        strengthBaseline: [
            { exerciseId: "75", exerciseNameSnapshot: "Barbell Overhead Press", workingWeightKg: 55, reps: 5 },
            { exerciseId: "30", exerciseNameSnapshot: "Barbell Bench Press", workingWeightKg: 97.5, reps: 6 },
            { exerciseId: "7", exerciseNameSnapshot: "Deadlift", workingWeightKg: 160, reps: 5 },
            { exerciseId: "98", exerciseNameSnapshot: "Back Squat", workingWeightKg: 140, reps: 5 },
        ],
        bodyCompositionSnapshot,
        profileVersion: 1,
        createdAt: `${addDays(today, -(DEMO_HISTORY_DAYS + 7))}T00:00:00Z`,
        updatedAt: `${latest.measuredAt}T00:00:00Z`,
    }
}

/** Snapshot built at import (fallback and static fields). The stored seed is rebuilt at seeding time. */
export const demoProfile: UserResponse = buildDemoProfile()

/** Built at import; seedDemoSession and the readers rebuild from the current date. */
export const demoWorkoutSessions: WorkoutSessionResponse[] = buildDemoWorkouts(getKstToday())

export const demoUserCondition: UserCondition = {
    doms: demoDomsFromSessions(demoWorkoutSessions, getKstToday()),
    painAreas: demoProfile.painAreas.map((painArea) => painArea.area),
}

/** DOMS from the stored demo sessions' real dates (a session saved today counts too). */
export function computeDemoCondition(): UserCondition {
    const sessions = getDemoRecentWorkouts(0, 100).content
    return {
        doms: demoDomsFromSessions(sessions, getKstToday()),
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
        benchPress: 97.5,
        squat: 140,
        deadlift: 160,
        overheadPress: 55,
    },
}

/** Saved routines built at import; seedDemoSession rebuilds from the current date. */
export const demoRoutineFinals: RoutineFinalResponse[] = buildDemoFinals(getKstToday())

/** The player's draft shape of a saved routine (same mapping as utils/routinePlay finalRoutineToDraft). */
export function demoDraftFromFinal(final: RoutineFinalResponse): RoutineDraft {
    const payload = final.finalRoutinePayload
    return {
        routineDraftId: final.routineDraftId,
        generationStatus: payload.generationStatus,
        statusReasonCode: payload.statusReasonCode,
        isFallback: payload.fallback,
        totalEstimatedTime: payload.totalEstimatedTime,
        summaryTitle: payload.summaryTitle,
        rationaleSummary: payload.rationaleSummary ?? [],
        warnings: payload.warnings ?? [],
        routineBlocks: payload.routineBlocks,
    }
}

/** Today's planned routine (the newest seeded final) as the seeded active routine. Built at import. */
export const demoRoutineDraft: RoutineDraft = demoDraftFromFinal(demoRoutineFinals[0])

/** Built at import; seedDemoSession rebuilds from the current date. */
export const demoDietLogs: DietLogResponse[] = buildDemoDietLogs(getKstToday())

export const readJson = <T>(key: string, fallback: T): T => {
    if (typeof window === "undefined") return fallback

    try {
        const raw = localStorage.getItem(key)
        return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
        return fallback
    }
}

export const writeJson = (key: string, value: unknown) => {
    if (typeof window === "undefined") return
    localStorage.setItem(key, JSON.stringify(value))
}

export function isDemoMode(): boolean {
    return typeof window !== "undefined" && localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true"
}

/** NEXT_PUBLIC_DEMO_ADMIN: the demo account gets ROLE_ADMIN only when this is exactly "true". */
export function isDemoAdminEnabled(flag: string | undefined = process.env.NEXT_PUBLIC_DEMO_ADMIN): boolean {
    return flag === "true"
}

export function demoRole(admin: boolean = isDemoAdminEnabled()): "ROLE_USER" | "ROLE_ADMIN" {
    return admin ? "ROLE_ADMIN" : "ROLE_USER"
}

export function createDemoToken(admin: boolean = isDemoAdminEnabled()): string {
    const encode = (value: unknown) =>
        btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")

    const now = Math.floor(Date.now() / 1000)
    return [
        encode({ alg: "none", typ: "JWT" }),
        encode({
            sub: demoProfile.email,
            auth: demoRole(admin),
            profileImage: demoProfile.profileImageUrl,
            iat: now,
            exp: now + 60 * 60 * 24 * 30,
            demo: true,
        }),
        "demo",
    ].join(".")
}

/** Seeds the demo keys with data built from the KST date at seeding time. */
export function seedDemoSession() {
    if (typeof window === "undefined") return

    const today = getKstToday()
    const profile = buildDemoProfile(today)
    const workouts = buildDemoWorkouts(today)
    const finals = buildDemoFinals(today)
    // finals[0] is today's planned routine; the seeded active routine is that routine, not yet started.
    // Its final id is not seeded: fitcore_routine_final_id belongs to the account-scoped in-progress keys
    // (utils/accountScopedStorage), and "Start" on the home card writes it when the routine is played.
    const todayRoutine = demoDraftFromFinal(finals[0])

    localStorage.setItem(DEMO_MODE_STORAGE_KEY, "true")
    localStorage.setItem(DEMO_DATA_VERSION_STORAGE_KEY, DEMO_DATA_VERSION)
    writeJson(DEMO_PROFILE_STORAGE_KEY, profile)
    writeJson(DEMO_WORKOUTS_STORAGE_KEY, workouts)
    writeJson(DEMO_DIETS_STORAGE_KEY, buildDemoDietLogs(today))
    writeJson(DEMO_NUTRITION_TARGET_STORAGE_KEY, demoNutritionTarget)
    writeJson(DEMO_ROUTINE_FINALS_STORAGE_KEY, finals)
    // Programs point at final ids; a reseed replaces the finals, so programs start over too.
    writeJson(DEMO_PROGRAMS_STORAGE_KEY, [])
    writeJson("fitcore_doms_data", demoDomsFromSessions(workouts, today))
    writeJson("fitcore_pain_areas", profile.painAreas.map((painArea) => painArea.area))
    writeJson("fitcore_active_routine", todayRoutine)
    // a split code, as writeActiveRoutine stores it (lineForRoutine and the demo finalize read it)
    localStorage.setItem("fitcore_split_label", finals[0].targetSplitLabel)
    // The active routine was replaced: drop what pointed at the previous one (as writeActiveRoutine and
    // prepareFinalRoutineForPlay do), so an older seed's backend final id or program link cannot survive a reseed.
    localStorage.removeItem("fitcore_routine_final_id")
    localStorage.removeItem("fitcore_player_progress")
    localStorage.removeItem("fitcore_program_context")
    localStorage.removeItem("fitcore_unavailable_equipment")
    localStorage.removeItem("fitcore_failed_workout_save")
}

const DEMO_ONLY_KEYS = [
    DEMO_MODE_STORAGE_KEY,
    DEMO_DATA_VERSION_STORAGE_KEY,
    DEMO_PROFILE_STORAGE_KEY,
    DEMO_WORKOUTS_STORAGE_KEY,
    DEMO_DIETS_STORAGE_KEY,
    DEMO_NUTRITION_TARGET_STORAGE_KEY,
    DEMO_ROUTINE_FINALS_STORAGE_KEY,
    DEMO_PROGRAMS_STORAGE_KEY,
]

/** Workout keys the demo session writes. Removed only while demo mode is on: then they hold demo data. */
const DEMO_SEEDED_WORKOUT_KEYS = [
    "fitcore_doms_data",
    "fitcore_pain_areas",
    "fitcore_active_routine",
    "fitcore_split_label",
    "fitcore_unavailable_equipment",
    "fitcore_routine_final_id",
    "fitcore_player_progress",
    "fitcore_program_context",
    "fitcore_failed_workout_save",
]

type DemoKeyStorage = Pick<Storage, "getItem" | "removeItem">

/**
 * Removes the demo session. Outside demo mode only the demo-only keys go, so a real account's
 * in-progress workout and failed-save backup survive logout and token expiry.
 */
export function clearDemoSession(storage?: DemoKeyStorage) {
    let target: DemoKeyStorage | undefined = storage
    if (!target) {
        if (typeof window === "undefined") return
        try {
            target = window.localStorage
        } catch {
            return
        }
    }
    let wasDemo = false
    try {
        wasDemo = target.getItem(DEMO_MODE_STORAGE_KEY) === "true"
    } catch {
        wasDemo = false
    }
    const keys = wasDemo ? [...DEMO_ONLY_KEYS, ...DEMO_SEEDED_WORKOUT_KEYS] : DEMO_ONLY_KEYS
    for (const key of keys) {
        try {
            target.removeItem(key)
        } catch {
            // ignore
        }
    }
}

/** Reseeds when the stored seed is from another DEMO_DATA_VERSION (or missing). Every demo reader calls it. */
export function ensureDemoSeed(): void {
    if (typeof window !== "undefined" && localStorage.getItem(DEMO_DATA_VERSION_STORAGE_KEY) !== DEMO_DATA_VERSION) {
        seedDemoSession()
    }
}

/** Spring Page shape over an in-memory list. */
export function toDemoPage<T>(items: T[], page: number, size: number): Page<T> {
    const start = page * size
    const content = items.slice(start, start + size)
    const totalPages = Math.max(1, Math.ceil(items.length / size))
    return {
        content,
        last: page >= totalPages - 1,
        totalPages,
        totalElements: items.length,
        size,
        number: page,
        first: page === 0,
        numberOfElements: content.length,
        empty: content.length === 0,
    }
}

export function getDemoProfile(): UserResponse {
    ensureDemoSeed()

    return readJson(DEMO_PROFILE_STORAGE_KEY, demoProfile)
}

/** Mirrors the backend merge: keys that are undefined or null keep the stored value; [] clears a list. */
export function mergeProfileUpdate(current: UserResponse, request: UserUpdateRequest): UserResponse {
    const defined = Object.fromEntries(
        Object.entries(request).filter(([, value]) => value !== undefined && value !== null)
    ) as Partial<UserResponse>
    return { ...current, ...defined }
}

export function updateDemoProfile(request: UserUpdateRequest): UserResponse {
    const updated = { ...mergeProfileUpdate(getDemoProfile(), request), updatedAt: new Date().toISOString() }
    writeJson(DEMO_PROFILE_STORAGE_KEY, updated)
    if (request.painAreas != null) {
        writeJson("fitcore_pain_areas", updated.painAreas.map((p) => p.area))
    }
    return updated
}

export function getDemoRecentWorkouts(page: number = 0, size: number = 10): Page<WorkoutSessionResponse> {
    ensureDemoSeed()

    return toDemoPage(readJson(DEMO_WORKOUTS_STORAGE_KEY, demoWorkoutSessions), page, size)
}

/** All stored demo workouts, newest first (no page cap). */
export function getAllDemoWorkouts(): WorkoutSessionResponse[] {
    ensureDemoSeed()
    return readJson(DEMO_WORKOUTS_STORAGE_KEY, demoWorkoutSessions)
}

function readAllDemoDietLogs(): DietLogResponse[] {
    ensureDemoSeed()
    return readJson<DietLogResponse[]>(DEMO_DIETS_STORAGE_KEY, demoDietLogs)
}

export function getDemoDietLogs(date: string): DietLogResponse[] {
    return readAllDemoDietLogs().filter((l) => l.logDate === date)
}

/** Demo counterpart of GET /api/diet-logs/daily-summary, aggregated from the stored demo logs. */
export function getDemoDailySummary(from: string, to: string): DietDailyAggregationResponse[] {
    return aggregateDietLogs(readAllDemoDietLogs(), from, to)
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
