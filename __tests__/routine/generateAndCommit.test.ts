import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { RoutineDraft } from "@/types/routine"
import type { RoutineGenerateRequest } from "@/utils/requestAssembler"
import { generateAndCommitRoutine, UNAVAILABLE_EQUIPMENT_KEY } from "@/app/ai_routine/generator/generateAndCommit"
import { ACTIVE_ROUTINE_KEY } from "@/utils/activeWorkout"
import { PROGRAM_CONTEXT_STORAGE_KEY } from "@/utils/programContext"

const oldRoutine = JSON.stringify({ routineDraftId: "old" })
const programContext = JSON.stringify({ programId: "p1", programItemId: "i1", routineFinalId: "f1" })

const payload = {
    targetMuscles: ["chest"],
    timeAvailableMin: 40,
    currentPainAreas: [],
    unavailableEquipment: ["CABLE"],
    currentDoms: [],
    goal: "hypertrophy",
    userNote: "",
    readinessLevel: "normal",
} as RoutineGenerateRequest

const draft = (overrides: Partial<RoutineDraft> = {}) =>
    ({
        routineDraftId: "new",
        generationStatus: "success",
        statusReasonCode: "none",
        isFallback: false,
        totalEstimatedTime: 40,
        summaryTitle: "가슴 루틴",
        rationaleSummary: [],
        warnings: [],
        routineBlocks: [],
        ...overrides,
    }) as unknown as RoutineDraft

let store: Map<string, string>

beforeEach(() => {
    store = new Map([
        [ACTIVE_ROUTINE_KEY, oldRoutine],
        [PROGRAM_CONTEXT_STORAGE_KEY, programContext],
    ])
    const localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
    }
    ;(globalThis as unknown as { window: unknown }).window = { localStorage }
    ;(globalThis as unknown as { localStorage: unknown }).localStorage = localStorage
})

afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage
})

describe("generateAndCommitRoutine", () => {
    it("keeps the unfinished program workout linked when generation throws", async () => {
        const failing = () => Promise.reject(new Error("network"))
        await expect(generateAndCommitRoutine(payload, failing, () => false)).rejects.toThrow("network")
        expect(store.get(PROGRAM_CONTEXT_STORAGE_KEY)).toBe(programContext)
        expect(store.get(ACTIVE_ROUTINE_KEY)).toBe(oldRoutine)
    })

    it("keeps the program link on a hard-failed generation", async () => {
        const outcome = await generateAndCommitRoutine(
            payload,
            () => Promise.resolve(draft({ generationStatus: "failed", statusReasonCode: "emptyCandidate" })),
            () => false,
        )
        expect(outcome).toEqual({ kind: "hardFailed", reasonCode: "emptyCandidate" })
        expect(store.get(PROGRAM_CONTEXT_STORAGE_KEY)).toBe(programContext)
        expect(store.get(ACTIVE_ROUTINE_KEY)).toBe(oldRoutine)
    })

    it("keeps the program link when the user left before the result arrived", async () => {
        const outcome = await generateAndCommitRoutine(payload, () => Promise.resolve(draft()), () => true)
        expect(outcome).toEqual({ kind: "cancelled" })
        expect(store.get(PROGRAM_CONTEXT_STORAGE_KEY)).toBe(programContext)
        expect(store.get(ACTIVE_ROUTINE_KEY)).toBe(oldRoutine)
    })

    it("clears the program link only after the new routine is written", async () => {
        const outcome = await generateAndCommitRoutine(payload, () => Promise.resolve(draft({ isFallback: true })), () => false)
        expect(outcome.kind).toBe("ready")
        expect(JSON.parse(store.get(ACTIVE_ROUTINE_KEY) ?? "{}").routineDraftId).toBe("new")
        expect(store.has(PROGRAM_CONTEXT_STORAGE_KEY)).toBe(false)
        expect(store.get(UNAVAILABLE_EQUIPMENT_KEY)).toBe(JSON.stringify(["CABLE"]))
    })
})
