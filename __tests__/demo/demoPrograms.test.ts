import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AxiosError } from "axios"
import AxiosController from "@/lib/axios/AxiosController"
import programApiClient from "@/lib/api/program/programApiClient"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import workoutApiClient, { type WorkoutSaveRequest } from "@/lib/api/workout/workoutApiClient"
import { seedDemoSession } from "@/utils/demoMode"

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

async function statusOf(promise: Promise<unknown>): Promise<number | undefined> {
    const error = await promise.then(
        () => undefined,
        (e) => e,
    )
    expect(error).toBeInstanceOf(AxiosError)
    return (error as AxiosError).response?.status
}

const saveRequest = (patch: Partial<WorkoutSaveRequest>): WorkoutSaveRequest => ({
    workoutDate: "2026-11-17",
    splitLabel: "Push",
    sourceRoutineFinalId: null,
    timeAvailableMin: 60,
    durationMin: 55,
    readinessLevel: "normal",
    currentPainAreas: [],
    currentDoms: [],
    unavailableEquipment: [],
    sets: [
        {
            exerciseOrder: 1,
            exerciseId: "ex_1",
            exerciseNameSnapshot: "벤치프레스",
            setIndex: 1,
            setType: "working",
            trackingMode: "weightReps",
            weightKg: 80,
            reps: 8,
            rir: 2,
            rpe: 8,
            isFailure: false,
            restSec: 120,
        },
    ],
    ...patch,
})

describe("programApiClient in demo mode", () => {
    let store: Map<string, string>
    let finalIds: string[]

    beforeEach(async () => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-11-17T03:00:00Z"))
        store = installStorage()
        seedDemoSession()
        finalIds = (await routineApiClient.getMyFinals(0, 3)).content.map((f) => f.routineFinalId)
    })
    afterEach(() => {
        vi.useRealTimers()
        delete (globalThis as { window?: unknown }).window
        delete (globalThis as { localStorage?: unknown }).localStorage
    })

    it("starts with no programs", async () => {
        await expect(programApiClient.getActiveProgram()).resolves.toBeNull()
        await expect(programApiClient.getPrograms()).resolves.toEqual([])
        expectNoBackendCalls()
    })

    it("creates an ACTIVE program at position 1 with items built from the saved routines", async () => {
        const program = await programApiClient.createProgram({ name: "  PPL  ", routineFinalIds: finalIds })
        expect(program).toMatchObject({ name: "PPL", status: "ACTIVE", currentPosition: 1, totalItems: 3, completedAt: null })
        expect(program.items.map((i) => [i.position, i.routineFinalId, i.state])).toEqual([
            [1, finalIds[0], "CURRENT"],
            [2, finalIds[1], "UPCOMING"],
            [3, finalIds[2], "UPCOMING"],
        ])
        const first = await routineApiClient.getFinal(finalIds[0])
        expect(program.items[0].title).toBe(first.finalRoutinePayload.summaryTitle)
        expect(program.items[0].targetSplitLabel).toBe(first.targetSplitLabel)
        expect(program.items[0].estimatedTime).toBe(first.finalRoutinePayload.totalEstimatedTime)
        expect(program.nextItem).toEqual(program.items[0])

        const active = await programApiClient.getActiveProgram()
        expect(active?.programId).toBe(program.programId)
        await expect(programApiClient.getProgram(program.programId)).resolves.toEqual(program)
        expect((await programApiClient.getPrograms()).map((p) => p.programId)).toEqual([program.programId])
        expectNoBackendCalls()
    })

    it("validates create like the backend", async () => {
        expect(await statusOf(programApiClient.createProgram({ name: " ", routineFinalIds: finalIds }))).toBe(400)
        expect(await statusOf(programApiClient.createProgram({ name: "x", routineFinalIds: [finalIds[0]] }))).toBe(400)
        expect(await statusOf(programApiClient.createProgram({ name: "x", routineFinalIds: [finalIds[0], finalIds[0]] }))).toBe(400)
        expect(await statusOf(programApiClient.createProgram({ name: "x", routineFinalIds: [finalIds[0], ""] }))).toBe(400)
        expect(await statusOf(programApiClient.createProgram({ name: "x", routineFinalIds: [finalIds[0], "missing"] }))).toBe(404)
        await programApiClient.createProgram({ name: "A", routineFinalIds: finalIds.slice(0, 2) })
        expect(await statusOf(programApiClient.createProgram({ name: "B", routineFinalIds: finalIds.slice(1, 3) }))).toBe(409)
        expectNoBackendCalls()
    })

    it("renames, archives (idempotently), activates and deletes only by the backend's rules", async () => {
        const a = await programApiClient.createProgram({ name: "A", routineFinalIds: finalIds.slice(0, 2) })
        expect((await programApiClient.updateProgram(a.programId, { name: " A2 " })).name).toBe("A2")
        expect(await statusOf(programApiClient.updateProgram(a.programId, { name: "" }))).toBe(400)
        expect(await statusOf(programApiClient.getProgram("nope"))).toBe(404)

        expect(await statusOf(programApiClient.activateProgram(a.programId))).toBe(409) // not archived
        expect(await statusOf(programApiClient.deleteProgramPermanently(a.programId))).toBe(409) // not archived

        const archived = await programApiClient.archiveProgram(a.programId)
        expect(archived.status).toBe("ARCHIVED")
        expect(archived.nextItem).toBeNull()
        expect(archived.items.map((i) => i.state)).toEqual(["UPCOMING", "UPCOMING"])
        expect((await programApiClient.archiveProgram(a.programId)).status).toBe("ARCHIVED")
        await expect(programApiClient.getActiveProgram()).resolves.toBeNull()

        vi.setSystemTime(new Date("2026-11-17T03:05:00Z"))
        const b = await programApiClient.createProgram({ name: "B", routineFinalIds: finalIds.slice(1, 3) })
        expect((await programApiClient.getPrograms()).map((p) => p.programId)).toEqual([b.programId, a.programId])
        expect(await statusOf(programApiClient.activateProgram(a.programId))).toBe(409) // B is active

        await programApiClient.archiveProgram(b.programId)
        expect((await programApiClient.activateProgram(a.programId)).status).toBe("ACTIVE")
        await programApiClient.deleteProgramPermanently(b.programId)
        expect((await programApiClient.getPrograms()).map((p) => p.programId)).toEqual([a.programId])
        expect(await statusOf(programApiClient.getProgram(b.programId))).toBe(404)
        expectNoBackendCalls()
    })

    it("advances on a program workout save and completes after the last item", async () => {
        const program = await programApiClient.createProgram({ name: "P", routineFinalIds: finalIds.slice(0, 2) })
        const [item1, item2] = program.items

        await workoutApiClient.save(
            saveRequest({ sourceRoutineFinalId: item1.routineFinalId, programId: program.programId, programItemId: item1.programItemId }),
        )
        let detail = await programApiClient.getProgram(program.programId)
        expect(detail.currentPosition).toBe(2)
        expect(detail.items.map((i) => i.state)).toEqual(["DONE", "CURRENT"])
        expect(detail.nextItem?.programItemId).toBe(item2.programItemId)

        const sessions = JSON.parse(store.get("fitcore_demo_workouts")!) as { sourceRoutineFinalId: string; targetSplitLabel?: string }[]
        expect(sessions[0].sourceRoutineFinalId).toBe(item1.routineFinalId)
        expect(sessions[0].targetSplitLabel).toBe(item1.targetSplitLabel)

        await workoutApiClient.save(
            saveRequest({ sourceRoutineFinalId: item2.routineFinalId, programId: program.programId, programItemId: item2.programItemId }),
        )
        detail = await programApiClient.getProgram(program.programId)
        expect(detail.status).toBe("COMPLETED")
        expect(detail.currentPosition).toBe(2)
        expect(detail.completedAt).not.toBeNull()
        expect(detail.nextItem).toBeNull()
        expect(detail.items.map((i) => i.state)).toEqual(["DONE", "DONE"])
        await expect(programApiClient.getActiveProgram()).resolves.toBeNull()
        // as on the backend, only the ARCHIVED status gates activation: a completed program can be archived then reactivated
        expect(await statusOf(programApiClient.activateProgram(program.programId))).toBe(409)
        await programApiClient.archiveProgram(program.programId)
        expect((await programApiClient.activateProgram(program.programId)).status).toBe("ACTIVE")
        expectNoBackendCalls()
    })

    it("rejects a mismatched program save without storing the session or advancing", async () => {
        const program = await programApiClient.createProgram({ name: "P", routineFinalIds: finalIds.slice(0, 2) })
        const [item1, item2] = program.items
        const before = store.get("fitcore_demo_workouts")

        expect(
            await statusOf(workoutApiClient.save(saveRequest({ sourceRoutineFinalId: item2.routineFinalId, programId: program.programId, programItemId: item2.programItemId }))),
        ).toBe(409) // not the current item
        expect(
            await statusOf(workoutApiClient.save(saveRequest({ sourceRoutineFinalId: item2.routineFinalId, programId: program.programId, programItemId: item1.programItemId }))),
        ).toBe(409) // routine does not match the item
        expect(
            await statusOf(workoutApiClient.save(saveRequest({ sourceRoutineFinalId: null, programId: program.programId, programItemId: item1.programItemId }))),
        ).toBe(400)
        expect(await statusOf(workoutApiClient.save(saveRequest({ sourceRoutineFinalId: item1.routineFinalId, programId: program.programId })))).toBe(400)

        expect(store.get("fitcore_demo_workouts")).toBe(before)
        expect((await programApiClient.getProgram(program.programId)).currentPosition).toBe(1)

        // a plain save (no program link) is unaffected
        await workoutApiClient.save(saveRequest({ sourceRoutineFinalId: item1.routineFinalId }))
        expect((await programApiClient.getProgram(program.programId)).currentPosition).toBe(1)
        expect(JSON.parse(store.get("fitcore_demo_workouts")!).length).toBe(JSON.parse(before!).length + 1)
        expectNoBackendCalls()
    })
})
