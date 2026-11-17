import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { RoutineDraft } from "@/types/routine"
import {
    ACTIVE_ROUTINE_KEY,
    clearWorkoutStorage,
    evaluateUnfinishedWorkout,
    FAILED_SAVE_KEY,
    needsOverwriteConfirm,
    parseFailedSave,
    parsePlayerProgress,
    PLAYER_PROGRESS_KEY,
    readFailedSave,
    ROUTINE_FINAL_ID_KEY,
    SPLIT_LABEL_KEY,
    writeActiveRoutine,
    writeFailedSave,
} from "@/utils/activeWorkout"

const routine = {
    routineDraftId: "draft-1",
    generationStatus: "success",
    statusReasonCode: "none",
    isFallback: false,
    totalEstimatedTime: 40,
    summaryTitle: "가슴 루틴",
    rationaleSummary: [],
    warnings: [],
    routineBlocks: [
        {
            order: 1,
            exerciseId: "ex_1",
            exerciseName: "Bench",
            exerciseRationale: "",
            prescription: [
                { setIndex: 1, setType: "working", targetReps: 8, targetWeightKg: 60, targetRir: 2, targetRestSec: 90 },
                { setIndex: 2, setType: "working", targetReps: 8, targetWeightKg: 60, targetRir: 2, targetRestSec: 90 },
            ],
        },
    ],
} as unknown as RoutineDraft

function installStorage() {
    const store = new Map<string, string>()
    const localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
    }
    ;(globalThis as unknown as { window: unknown }).window = { localStorage }
    ;(globalThis as unknown as { localStorage: unknown }).localStorage = localStorage
    return store
}

describe("parsePlayerProgress", () => {
    it("accepts the legacy shape", () => {
        const p = parsePlayerProgress(JSON.stringify({ routineId: "r1", checkedSets: ["0-0"] }), 123)
        expect(p).toEqual({ routineId: "r1", checkedSets: ["0-0"], actuals: {}, startedAt: 123, rest: null })
    })

    it("keeps actuals, start time and rest, drops malformed entries", () => {
        const p = parsePlayerProgress(
            JSON.stringify({
                routineId: "r1",
                checkedSets: ["0-0", 5],
                actuals: { "0-0": { weightKg: 62.5, reps: 7 }, "0-1": { weightKg: "x", reps: 1 } },
                startedAt: 50,
                rest: { endsAt: 999, pausedAt: null },
            }),
        )
        expect(p?.checkedSets).toEqual(["0-0"])
        expect(p?.actuals).toEqual({ "0-0": { weightKg: 62.5, reps: 7 } })
        expect(p?.startedAt).toBe(50)
        expect(p?.rest).toEqual({ endsAt: 999, pausedAt: null })
    })

    it("returns null for garbage", () => {
        expect(parsePlayerProgress("{bad")).toBeNull()
        expect(parsePlayerProgress(null)).toBeNull()
        expect(parsePlayerProgress(JSON.stringify({ checkedSets: [] }))).toBeNull()
    })
})

describe("evaluateUnfinishedWorkout", () => {
    const progress = (routineId: string, checkedSets: string[]) => ({ routineId, checkedSets, actuals: {}, startedAt: 0, rest: null })

    it("requires a matching routine id and at least one checked set", () => {
        expect(evaluateUnfinishedWorkout(routine, null, progress("draft-1", ["0-0"]))).toMatchObject({ doneSets: 1, totalSets: 2, title: "가슴 루틴" })
        expect(evaluateUnfinishedWorkout(routine, "final-9", progress("draft-1", ["0-0"]))).toBeNull()
        expect(evaluateUnfinishedWorkout(routine, "final-9", progress("final-9", ["0-0"]))).not.toBeNull()
        expect(evaluateUnfinishedWorkout(routine, null, progress("draft-1", []))).toBeNull()
        expect(evaluateUnfinishedWorkout(null, null, progress("draft-1", ["0-0"]))).toBeNull()
    })
})

describe("storage helpers", () => {
    let store: Map<string, string>
    beforeEach(() => {
        store = installStorage()
    })
    afterEach(() => {
        delete (globalThis as { window?: unknown }).window
        delete (globalThis as { localStorage?: unknown }).localStorage
    })

    it("writeActiveRoutine resets progress and clears a stale split label / final id", () => {
        store.set(PLAYER_PROGRESS_KEY, JSON.stringify({ routineId: "draft-1", checkedSets: ["0-0"] }))
        store.set(SPLIT_LABEL_KEY, "push")
        store.set(ROUTINE_FINAL_ID_KEY, "old-final")
        writeActiveRoutine(routine, { finalId: null })
        expect(store.has(PLAYER_PROGRESS_KEY)).toBe(false)
        expect(store.has(SPLIT_LABEL_KEY)).toBe(false)
        expect(store.has(ROUTINE_FINAL_ID_KEY)).toBe(false)
        expect(JSON.parse(store.get(ACTIVE_ROUTINE_KEY) as string).routineDraftId).toBe("draft-1")

        writeActiveRoutine(routine, { finalId: "f1", splitLabel: "legs" })
        expect(store.get(ROUTINE_FINAL_ID_KEY)).toBe("f1")
        expect(store.get(SPLIT_LABEL_KEY)).toBe("legs")
    })

    it("needsOverwriteConfirm only when progress belongs to the active routine", () => {
        store.set(ACTIVE_ROUTINE_KEY, JSON.stringify(routine))
        expect(needsOverwriteConfirm()).toBe(false)
        store.set(PLAYER_PROGRESS_KEY, JSON.stringify({ routineId: "other", checkedSets: ["0-0"] }))
        expect(needsOverwriteConfirm()).toBe(false)
        store.set(PLAYER_PROGRESS_KEY, JSON.stringify({ routineId: "draft-1", checkedSets: ["0-0"] }))
        expect(needsOverwriteConfirm()).toBe(true)
    })

    it("failed save round-trips and clearWorkoutStorage keeps it", () => {
        const payload = { workoutDate: "2026-11-16", splitLabel: "x", sets: [{ reps: 8 }] }
        writeFailedSave({ payload: payload as never, reason: "auth", routineId: "draft-1", programId: null, failedAt: 1 })
        clearWorkoutStorage()
        expect(store.has(FAILED_SAVE_KEY)).toBe(true)
        expect(readFailedSave()).toMatchObject({ reason: "auth", routineId: "draft-1" })
    })
})

describe("parseFailedSave", () => {
    it("accepts a legacy raw payload", () => {
        const legacy = { workoutDate: "2026-11-16", sourceRoutineFinalId: "f1", sets: [{ reps: 8 }] }
        expect(parseFailedSave(JSON.stringify(legacy))).toMatchObject({ reason: "network", routineId: "f1" })
    })

    it("rejects empty payloads", () => {
        expect(parseFailedSave(JSON.stringify({ payload: { sets: [] } }))).toBeNull()
        expect(parseFailedSave("nope")).toBeNull()
    })
})
