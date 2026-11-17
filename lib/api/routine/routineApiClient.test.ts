import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AxiosController from "@/lib/axios/AxiosController"
import routineApiClient from "@/lib/api/routine/routineApiClient"

vi.mock("@/lib/axios/AxiosController", () => ({
    default: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}))

const mockedAxios = AxiosController as unknown as Record<"get" | "post" | "delete" | "patch", ReturnType<typeof vi.fn>>

/** A real (non-demo) session: storage exists but the demo flag is not set. */
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

describe("routineApiClient outside demo mode", () => {
    let store: Map<string, string>

    beforeEach(() => {
        vi.clearAllMocks()
        store = installStorage()
    })
    afterEach(() => {
        delete (globalThis as { window?: unknown }).window
        delete (globalThis as { localStorage?: unknown }).localStorage
    })

    it("reads finals from the backend", async () => {
        mockedAxios.get.mockResolvedValueOnce({ content: [] })
        await routineApiClient.getMyFinals(0, 1)
        expect(mockedAxios.get).toHaveBeenCalledWith("/api/routines/finals?page=0&size=1")

        mockedAxios.get.mockResolvedValueOnce({ routineFinalId: "f1" })
        await expect(routineApiClient.getFinal("f1")).resolves.toEqual({ routineFinalId: "f1" })
        expect(mockedAxios.get).toHaveBeenLastCalledWith("/api/routines/finals/f1")
    })

    it("finalizes on the backend and stores its split label", async () => {
        mockedAxios.post.mockResolvedValueOnce({ routineFinalId: "f9", targetSplitLabel: "pull" })
        const payload = {
            targetWorkoutDate: "2026-11-17",
            finalRoutinePayload: { routineBlocks: [] },
            acceptedWithoutEdits: true,
            userEditSummary: [],
        }
        await expect(routineApiClient.finalize("d1", payload)).resolves.toBe("f9")
        expect(mockedAxios.post).toHaveBeenCalledWith("/api/routines/drafts/d1/finalize", payload)
        expect(store.get("fitcore_split_label")).toBe("pull")
    })

    it("creates manual drafts on the backend with the same normalisation", async () => {
        mockedAxios.post.mockResolvedValueOnce({ routineDraftId: "m1", summaryTitle: "" })
        const draft = await routineApiClient.createManualDraft("새 루틴")
        expect(mockedAxios.post).toHaveBeenCalledWith("/api/routines/drafts/manual", { title: "새 루틴" })
        expect(draft).toMatchObject({
            routineDraftId: "m1",
            summaryTitle: "새 루틴",
            routineBlocks: [],
            rationaleSummary: [],
            warnings: [],
            totalEstimatedTime: 0,
            isFallback: false,
        })

        mockedAxios.post.mockResolvedValueOnce({ routineDraftId: "m2" })
        await routineApiClient.createManualDraft()
        expect(mockedAxios.post).toHaveBeenLastCalledWith("/api/routines/drafts/manual", {})
    })
})
