import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AxiosError } from "axios"
import AxiosController from "@/lib/axios/AxiosController"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import { DEMO_ROUTINE_FINALS_STORAGE_KEY, clearDemoSession, seedDemoSession } from "@/utils/demoMode"
import { buildDemoFinals, buildDemoWorkouts } from "@/utils/demoSeed"
import { PAIN_AREA_SLUGS, TRAINABLE_MUSCLE_SLUGS } from "@/utils/displayLabels"
import type { RoutineDraft } from "@/types/routine"

vi.mock("@/lib/axios/AxiosController", () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    redirectToLogin: vi.fn(),
}))

const mockedAxios = AxiosController as unknown as Record<"get" | "post" | "put" | "patch" | "delete", ReturnType<typeof vi.fn>>
const expectNoBackendCalls = () => {
    for (const fn of Object.values(mockedAxios)) expect(fn).not.toHaveBeenCalled()
}

function installStorage() {
    const store = new Map<string, string>()
    const localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
    }
    ;(globalThis as unknown as { window: unknown }).window = { localStorage }
    ;(globalThis as unknown as { localStorage: unknown }).localStorage = localStorage
    return store
}

const TODAY = "2026-11-17"

describe("demo seed: saved routines", () => {
    const sessions = buildDemoWorkouts(TODAY)
    const finals = buildDemoFinals(TODAY)

    it("has one final per seeded session, with the session's sourceRoutineFinalId and its exercises", () => {
        expect(finals).toHaveLength(sessions.length + 1)
        for (const session of sessions) {
            const final = finals.find((f) => f.routineFinalId === session.sourceRoutineFinalId)
            expect(final, session.sourceRoutineFinalId).toBeDefined()
            expect(final!.targetWorkoutDate).toBe(session.workoutDate)
            expect(final!.targetSplitLabel).toBe(session.targetSplitLabel)
            expect(final!.finalRoutinePayload.summaryTitle).toBe(session.routineName)
            const blockSets = final!.finalRoutinePayload.routineBlocks.flatMap((block) =>
                block.prescription.map((p) => [block.order, block.exerciseId, p.setIndex, p.setType, p.targetReps, p.targetWeightKg]),
            )
            const sessionSets = session.sets.map((s) => [s.exerciseOrder, s.exerciseId, s.setIndex, s.setType, s.reps, s.weightKg])
            expect(blockSets).toEqual(sessionSets)
        }
    })

    it("is render-ready: 1-based sets, SSOT muscle slugs, a real estimate and title", () => {
        const slugs = new Set<string>([...TRAINABLE_MUSCLE_SLUGS, ...PAIN_AREA_SLUGS])
        for (const final of finals) {
            const payload = final.finalRoutinePayload
            expect(payload.generationStatus).toBe("success")
            expect(payload.statusReasonCode).toBe("none")
            expect(payload.fallback).toBe(false)
            expect(payload.totalEstimatedTime).toBeGreaterThan(0)
            expect(payload.summaryTitle.trim()).not.toBe("")
            expect(Array.isArray(payload.rationaleSummary)).toBe(true)
            expect(Array.isArray(payload.warnings)).toBe(true)
            expect(payload.routineBlocks.length).toBeGreaterThan(0)
            for (const block of payload.routineBlocks) {
                expect(block.prescription.map((p) => p.setIndex)).toEqual(block.prescription.map((_, i) => i + 1))
                expect(block.primaryMuscles?.length).toBeGreaterThan(0)
                for (const muscle of block.primaryMuscles ?? []) {
                    expect(slugs.has(muscle), muscle).toBe(true)
                    expect(muscle).not.toMatch(/^[A-Z_]+$/) // never a legacy enum like CHEST_MID
                }
            }
        }
    })

    it("leads with today's planned routine: the next split in the rotation, saved before any newer final", () => {
        const [todayFinal, ...past] = finals
        expect(todayFinal.targetWorkoutDate).toBe(TODAY)
        expect(sessions.some((s) => s.sourceRoutineFinalId === todayFinal.routineFinalId)).toBe(false)
        const rotation = ["push", "pull", "legs"]
        const lastSplit = sessions[0].targetSplitLabel!
        expect(todayFinal.targetSplitLabel).toBe(rotation[(rotation.indexOf(lastSplit) + 1) % 3])
        expect(todayFinal.finalRoutinePayload.totalEstimatedTime).toBeGreaterThan(0)
        const savedAts = finals.map((f) => f.savedAt)
        expect([...savedAts].sort().reverse()).toEqual(savedAts)
        expect(past.every((f) => f.savedAt < todayFinal.savedAt)).toBe(true)
    })
})

describe("routineApiClient in demo mode", () => {
    let store: Map<string, string>

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-11-17T03:00:00Z")) // 12:00 KST
        store = installStorage()
        seedDemoSession()
    })
    afterEach(() => {
        vi.useRealTimers()
        delete (globalThis as { window?: unknown }).window
        delete (globalThis as { localStorage?: unknown }).localStorage
    })

    it("resolves every seeded session's sourceRoutineFinalId through getFinal", async () => {
        const sessions = JSON.parse(store.get("fitcore_demo_workouts")!) as { sourceRoutineFinalId: string }[]
        expect(sessions.length).toBeGreaterThan(18)
        for (const session of sessions) {
            const final = await routineApiClient.getFinal(session.sourceRoutineFinalId)
            expect(final.routineFinalId).toBe(session.sourceRoutineFinalId)
        }
        expectNoBackendCalls()
    })

    it("rejects an unknown final like a 404", async () => {
        const error = await routineApiClient.getFinal("someone-elses-final").catch((e) => e)
        expect(error).toBeInstanceOf(AxiosError)
        expect((error as AxiosError).response?.status).toBe(404)
        expectNoBackendCalls()
    })

    it("pages finals newest first with today's routine first and a proper Page shape", async () => {
        const first = await routineApiClient.getMyFinals(0, 1)
        expect(first.content).toHaveLength(1)
        expect(first.content[0].targetWorkoutDate).toBe(TODAY)
        expect(first.content[0].finalRoutinePayload.totalEstimatedTime).toBeGreaterThan(0)
        expect(first).toMatchObject({ number: 0, size: 1, first: true, last: false, numberOfElements: 1, empty: false })
        expect(first.totalPages).toBe(first.totalElements)

        const all = await routineApiClient.getMyFinals(0, 200)
        expect(all.last).toBe(true)
        const savedAts = all.content.map((f) => f.savedAt)
        expect([...savedAts].sort().reverse()).toEqual(savedAts)
        const lastPage = await routineApiClient.getMyFinals(all.totalElements - 1, 1)
        expect(lastPage.last).toBe(true)
        expectNoBackendCalls()
    })

    it("seeds today's routine as the active routine with its split code", () => {
        const finals = JSON.parse(store.get(DEMO_ROUTINE_FINALS_STORAGE_KEY)!) as { routineDraftId: string; targetSplitLabel: string }[]
        const active = JSON.parse(store.get("fitcore_active_routine")!) as RoutineDraft
        expect(active.routineDraftId).toBe(finals[0].routineDraftId)
        expect(active.totalEstimatedTime).toBeGreaterThan(0)
        expect(store.get("fitcore_split_label")).toBe(finals[0].targetSplitLabel)
    })

    it("finalizes the active routine locally with its metadata, newest first, and sets the split label", async () => {
        const active = JSON.parse(store.get("fitcore_active_routine")!) as RoutineDraft
        vi.setSystemTime(new Date("2026-11-17T04:00:00Z"))
        const id = await routineApiClient.finalize(active.routineDraftId, {
            targetWorkoutDate: TODAY,
            finalRoutinePayload: { routineBlocks: active.routineBlocks.slice(0, 2) },
            acceptedWithoutEdits: false,
            userEditSummary: ["운동 삭제"],
        })
        expect(id).toMatch(/^demo-final-local-/)
        const final = await routineApiClient.getFinal(id)
        expect(final.routineDraftId).toBe(active.routineDraftId)
        expect(final.finalRoutinePayload.summaryTitle).toBe(active.summaryTitle)
        expect(final.finalRoutinePayload.totalEstimatedTime).toBe(active.totalEstimatedTime)
        expect(final.finalRoutinePayload.routineBlocks).toHaveLength(2)
        expect(final.userEditSummary).toEqual(["운동 삭제"])
        expect(final.targetSplitLabel).toBe(store.get("fitcore_split_label"))
        const page = await routineApiClient.getMyFinals(0, 1)
        expect(page.content[0].routineFinalId).toBe(id)
        expectNoBackendCalls()
    })

    it("finalizes the legacy demo-draft-001 and a backend-generated draft without touching the backend", async () => {
        for (const routineDraftId of ["demo-draft-001", "3f1c2a9e-generated-by-backend"]) {
            const draft: RoutineDraft = {
                routineDraftId,
                generationStatus: "fallback",
                statusReasonCode: "ai_timeout",
                isFallback: true,
                totalEstimatedTime: 50,
                summaryTitle: "AI 가슴 루틴",
                rationaleSummary: ["이유"],
                warnings: ["주의"],
                routineBlocks: [
                    {
                        order: 1,
                        exerciseId: "ex_1",
                        exerciseName: "벤치프레스",
                        primaryMuscles: ["chest"],
                        exerciseRationale: "",
                        prescription: [{ setIndex: 1, setType: "working", targetReps: 8, targetWeightKg: 80, targetRir: 2, targetRestSec: 120 }],
                    },
                ],
            }
            store.set("fitcore_active_routine", JSON.stringify(draft))
            store.set("fitcore_split_label", "push")
            const id = await routineApiClient.finalize(routineDraftId, {
                targetWorkoutDate: TODAY,
                finalRoutinePayload: { routineBlocks: draft.routineBlocks },
                acceptedWithoutEdits: true,
                userEditSummary: [],
            })
            const final = await routineApiClient.getFinal(id)
            expect(final.finalRoutinePayload).toMatchObject({
                fallback: true,
                generationStatus: "fallback",
                statusReasonCode: "ai_timeout",
                summaryTitle: "AI 가슴 루틴",
                totalEstimatedTime: 50,
                rationaleSummary: ["이유"],
                warnings: ["주의"],
            })
            expect(final.targetSplitLabel).toBe("push")
        }
        expectNoBackendCalls()
    })

    it("creates and finalizes a manual draft locally, estimating its time and using the custom split", async () => {
        const draft = await routineApiClient.createManualDraft("새 루틴")
        expect(draft).toMatchObject({
            generationStatus: "success",
            statusReasonCode: "none",
            isFallback: false,
            totalEstimatedTime: 0,
            summaryTitle: "새 루틴",
            routineBlocks: [],
            rationaleSummary: [],
            warnings: [],
        })
        expect(draft.routineDraftId).toMatch(/^demo-draft-manual-/)
        const other = await routineApiClient.createManualDraft()
        expect(other.routineDraftId).not.toBe(draft.routineDraftId)
        expect(other.summaryTitle).toBe("새 루틴")

        const blocks = [
            {
                order: 1,
                exerciseId: "ex_2",
                exerciseName: "스쿼트",
                exerciseRationale: "",
                prescription: [1, 2, 3].map((setIndex) => ({ setIndex, setType: "working", targetReps: 5, targetWeightKg: 100, targetRir: 2, targetRestSec: 180 })),
            },
        ]
        // the draft page stores the edited draft right before finalizing; a manual draft has no split label
        store.set("fitcore_active_routine", JSON.stringify({ ...draft, routineBlocks: blocks }))
        store.delete("fitcore_split_label")
        const id = await routineApiClient.finalize(draft.routineDraftId, {
            targetWorkoutDate: TODAY,
            finalRoutinePayload: { routineBlocks: blocks },
            acceptedWithoutEdits: false,
            userEditSummary: [],
        })
        const final = await routineApiClient.getFinal(id)
        expect(final.targetSplitLabel).toBe("custom")
        expect(store.get("fitcore_split_label")).toBe("custom")
        expect(final.finalRoutinePayload.totalEstimatedTime).toBeGreaterThan(0)
        expect(final.finalRoutinePayload.summaryTitle).toBe("새 루틴")
        expectNoBackendCalls()
    })

    it("gives a manual draft the custom split even when a stale split label is stored", async () => {
        const draft = await routineApiClient.createManualDraft("새 루틴")
        const blocks = [
            {
                order: 1,
                exerciseId: "ex_2",
                exerciseName: "스쿼트",
                exerciseRationale: "",
                prescription: [{ setIndex: 1, setType: "working", targetReps: 5, targetWeightKg: 100, targetRir: 2, targetRestSec: 180 }],
            },
        ]
        // e.g. onboarding StepDone stored the draft without clearing the seeded split label
        store.set("fitcore_active_routine", JSON.stringify({ ...draft, routineBlocks: blocks }))
        store.set("fitcore_split_label", "pull")
        const id = await routineApiClient.finalize(draft.routineDraftId, {
            targetWorkoutDate: TODAY,
            finalRoutinePayload: { routineBlocks: blocks },
            acceptedWithoutEdits: false,
            userEditSummary: [],
        })
        const final = await routineApiClient.getFinal(id)
        expect(final.targetSplitLabel).toBe("custom")
        expect(store.get("fitcore_split_label")).toBe("custom")
        expectNoBackendCalls()
    })

    it("still sends generate to the backend", async () => {
        mockedAxios.post.mockResolvedValueOnce({
            routineDraftId: "d1",
            generationStatus: "success",
            statusReasonCode: "none",
            isFallback: false,
            totalEstimatedTime: 60,
            summaryTitle: "t",
            rationaleSummary: [],
            warnings: [],
            routineBlocks: [],
        })
        await routineApiClient.generate({} as never).catch(() => undefined)
        expect(mockedAxios.post).toHaveBeenCalledWith("/api/routines/generate", {})
    })

    it("reseeds a v4 browser with the finals and an empty program list, and clearDemoSession removes them", async () => {
        store.set("fitcore_demo_data_version", "2026-11-17-demo-v4")
        store.delete(DEMO_ROUTINE_FINALS_STORAGE_KEY)
        store.set("fitcore_demo_programs", JSON.stringify([{ programId: "stale" }]))
        // a v4 visitor who started the shared account's backend final / program
        store.set("fitcore_routine_final_id", "backend-final-uuid")
        store.set("fitcore_player_progress", JSON.stringify({ routineId: "backend-final-uuid", checkedSets: [] }))
        store.set(
            "fitcore_program_context",
            JSON.stringify({ programId: "backend-program", programItemId: "backend-item", routineFinalId: "backend-final-uuid" }),
        )
        const page = await routineApiClient.getMyFinals(0, 1)
        expect(page.content[0].targetWorkoutDate).toBe(TODAY)
        expect(store.get("fitcore_demo_data_version")).toBe("2026-11-17-demo-v5")
        expect(JSON.parse(store.get("fitcore_demo_programs")!)).toEqual([])
        expect(store.has("fitcore_routine_final_id")).toBe(false)
        expect(store.has("fitcore_player_progress")).toBe(false)
        expect(store.has("fitcore_program_context")).toBe(false)

        clearDemoSession()
        expect(store.has(DEMO_ROUTINE_FINALS_STORAGE_KEY)).toBe(false)
        expect(store.has("fitcore_demo_programs")).toBe(false)
    })
})
