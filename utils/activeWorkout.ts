import type { RoutineDraft } from "@/types/routine"
import type { WorkoutSaveRequest } from "@/lib/api/workout/workoutApiClient"
import { clearProgramContext } from "@/utils/programContext"

/** localStorage keys for the workout in progress. The player, home card and every "start" path share them. */
export const ACTIVE_ROUTINE_KEY = "fitcore_active_routine"
export const ROUTINE_FINAL_ID_KEY = "fitcore_routine_final_id"
export const SPLIT_LABEL_KEY = "fitcore_split_label"
export const PLAYER_PROGRESS_KEY = "fitcore_player_progress"
export const FAILED_SAVE_KEY = "fitcore_failed_workout_save"

/** What the user actually did on one set. weightKg null = bodyweight. */
export interface ActualSet {
    weightKg: number | null
    reps: number
    isFailure?: boolean
}

/** Rest timer persisted as absolute times so a refresh or background tab keeps it. */
export interface RestTimerState {
    endsAt: number
    /** Set while paused: the moment the pause started. */
    pausedAt: number | null
}

export interface PlayerProgress {
    routineId: string
    checkedSets: string[]
    actuals: Record<string, ActualSet>
    startedAt: number
    rest: RestTimerState | null
}

export interface FailedWorkoutSave {
    payload: WorkoutSaveRequest
    /** "auth" when the save got a 401: the user has to log in again before retrying. */
    reason: "auth" | "network"
    routineId: string | null
    programId: string | null
    failedAt: number
}

function storage(): Storage | null {
    try {
        return typeof window === "undefined" ? null : window.localStorage
    } catch {
        return null
    }
}

function parseJson(raw: string | null): unknown {
    if (!raw) return null
    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

function parseActual(value: unknown): ActualSet | null {
    if (!isRecord(value)) return null
    const reps = value.reps
    const weightKg = value.weightKg
    if (typeof reps !== "number" || !Number.isFinite(reps)) return null
    if (weightKg !== null && (typeof weightKg !== "number" || !Number.isFinite(weightKg))) return null
    return { weightKg, reps, ...(value.isFailure === true ? { isFailure: true } : {}) }
}

/** Parses stored progress; accepts the legacy `{routineId, checkedSets}` shape. */
export function parsePlayerProgress(raw: string | null, now: number = Date.now()): PlayerProgress | null {
    const data = parseJson(raw)
    if (!isRecord(data) || typeof data.routineId !== "string" || !Array.isArray(data.checkedSets)) return null
    const checkedSets = data.checkedSets.filter((key): key is string => typeof key === "string")
    const actuals: Record<string, ActualSet> = {}
    if (isRecord(data.actuals)) {
        for (const [key, value] of Object.entries(data.actuals)) {
            const actual = parseActual(value)
            if (actual) actuals[key] = actual
        }
    }
    const startedAt = typeof data.startedAt === "number" && Number.isFinite(data.startedAt) ? data.startedAt : now
    let rest: RestTimerState | null = null
    if (isRecord(data.rest) && typeof data.rest.endsAt === "number") {
        rest = { endsAt: data.rest.endsAt, pausedAt: typeof data.rest.pausedAt === "number" ? data.rest.pausedAt : null }
    }
    return { routineId: data.routineId, checkedSets, actuals, startedAt, rest }
}

export function readPlayerProgress(): PlayerProgress | null {
    return parsePlayerProgress(storage()?.getItem(PLAYER_PROGRESS_KEY) ?? null)
}

export function writePlayerProgress(progress: PlayerProgress): void {
    try {
        storage()?.setItem(PLAYER_PROGRESS_KEY, JSON.stringify(progress))
    } catch {
        /* quota or blocked storage: progress just won't survive a refresh */
    }
}

export function clearPlayerProgress(): void {
    storage()?.removeItem(PLAYER_PROGRESS_KEY)
}

export const routineIdOf = (routine: Pick<RoutineDraft, "routineDraftId">, finalId: string | null): string | null =>
    finalId ?? routine.routineDraftId ?? null

export function readActiveRoutine(): RoutineDraft | null {
    const data = parseJson(storage()?.getItem(ACTIVE_ROUTINE_KEY) ?? null)
    if (!isRecord(data) || !Array.isArray(data.routineBlocks)) return null
    return data as unknown as RoutineDraft
}

export const totalSetCount = (routine: Pick<RoutineDraft, "routineBlocks">): number =>
    routine.routineBlocks.reduce((sum, block) => sum + (block.prescription?.length ?? 0), 0)

export interface UnfinishedWorkout {
    routine: RoutineDraft
    routineId: string
    doneSets: number
    totalSets: number
    title: string
}

/**
 * The active routine has saved progress that belongs to it (at least one set checked).
 * A fully checked but unsaved workout also counts: the player opens on its finish screen.
 */
export function evaluateUnfinishedWorkout(
    routine: RoutineDraft | null,
    finalId: string | null,
    progress: PlayerProgress | null,
): UnfinishedWorkout | null {
    if (!routine || !progress) return null
    const routineId = routineIdOf(routine, finalId)
    if (!routineId || progress.routineId !== routineId) return null
    const totalSets = totalSetCount(routine)
    const doneSets = progress.checkedSets.length
    if (doneSets === 0 || totalSets === 0) return null
    return { routine, routineId, doneSets: Math.min(doneSets, totalSets), totalSets, title: routine.summaryTitle?.trim() || "오늘의 루틴" }
}

export function readUnfinishedWorkout(): UnfinishedWorkout | null {
    return evaluateUnfinishedWorkout(readActiveRoutine(), storage()?.getItem(ROUTINE_FINAL_ID_KEY) ?? null, readPlayerProgress())
}

/** True when starting a routine (even the same one again) would throw away an unfinished workout. */
export function needsOverwriteConfirm(): boolean {
    return readUnfinishedWorkout() !== null
}

/** Copy shared by every confirmation sheet shown before overwriting an unfinished workout. */
export const OVERWRITE_CONFIRM_COPY = {
    title: "진행 중인 운동이 있어요",
    description: "새 루틴을 시작하면 진행 중인 운동 기록이 사라져요.",
    resume: "이어서 하기",
    replace: "새로 시작",
} as const

/**
 * Stores the routine the player (or the draft editor) will open, replacing any previous one.
 * Resets progress, start time and rest timer, and clears a stale final id / split label.
 */
export function writeActiveRoutine(draft: RoutineDraft, options: { finalId?: string | null; splitLabel?: string | null } = {}): void {
    const s = storage()
    if (!s) return
    s.setItem(ACTIVE_ROUTINE_KEY, JSON.stringify(draft))
    if (options.finalId) s.setItem(ROUTINE_FINAL_ID_KEY, options.finalId)
    else if (options.finalId === null) s.removeItem(ROUTINE_FINAL_ID_KEY)
    if (options.splitLabel) s.setItem(SPLIT_LABEL_KEY, options.splitLabel)
    else s.removeItem(SPLIT_LABEL_KEY)
    s.removeItem(PLAYER_PROGRESS_KEY)
}

/**
 * Removes everything that belongs to the finished (or discarded) workout.
 * Keeps a failed save: it may belong to an older workout; callers clear it with clearFailedSave().
 */
export function clearWorkoutStorage(): void {
    const s = storage()
    if (!s) return
    s.removeItem(ACTIVE_ROUTINE_KEY)
    s.removeItem("fitcore_doms_data")
    s.removeItem("fitcore_pain_areas")
    s.removeItem(ROUTINE_FINAL_ID_KEY)
    s.removeItem(SPLIT_LABEL_KEY)
    s.removeItem("fitcore_unavailable_equipment")
    s.removeItem(PLAYER_PROGRESS_KEY)
    clearProgramContext()
}

export function parseFailedSave(raw: string | null): FailedWorkoutSave | null {
    const data = parseJson(raw)
    if (!isRecord(data)) return null
    // Legacy: the raw WorkoutSaveRequest was stored directly.
    if (Array.isArray(data.sets)) {
        const payload = data as unknown as WorkoutSaveRequest
        return { payload, reason: "network", routineId: payload.sourceRoutineFinalId ?? null, programId: payload.programId ?? null, failedAt: 0 }
    }
    if (!isRecord(data.payload) || !Array.isArray(data.payload.sets) || data.payload.sets.length === 0) return null
    return {
        payload: data.payload as unknown as WorkoutSaveRequest,
        reason: data.reason === "auth" ? "auth" : "network",
        routineId: typeof data.routineId === "string" ? data.routineId : null,
        programId: typeof data.programId === "string" ? data.programId : null,
        failedAt: typeof data.failedAt === "number" ? data.failedAt : 0,
    }
}

export function readFailedSave(): FailedWorkoutSave | null {
    return parseFailedSave(storage()?.getItem(FAILED_SAVE_KEY) ?? null)
}

export function writeFailedSave(entry: FailedWorkoutSave): void {
    try {
        storage()?.setItem(FAILED_SAVE_KEY, JSON.stringify(entry))
    } catch {
        /* nothing more we can do */
    }
}

export function clearFailedSave(): void {
    storage()?.removeItem(FAILED_SAVE_KEY)
}

/** Status code of an axios-style error, if any. */
export function httpStatusOf(err: unknown): number | null {
    const status = (err as { response?: { status?: unknown } } | null)?.response?.status
    return typeof status === "number" ? status : null
}
