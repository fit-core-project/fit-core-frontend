import { beforeEach, describe, expect, it, vi } from "vitest"
import AxiosController from "@/lib/axios/AxiosController"
import workoutApiClient, { type WorkoutSaveRequest } from "@/lib/api/workout/workoutApiClient"

vi.mock("@/lib/axios/AxiosController", () => ({
    default: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}))

const mockedAxios = AxiosController as unknown as Record<"get" | "post", ReturnType<typeof vi.fn>>

describe("workoutApiClient outside demo mode", () => {
    beforeEach(() => vi.clearAllMocks())

    it("sends a program workout save to the backend unchanged", async () => {
        mockedAxios.post.mockResolvedValueOnce(undefined)
        const request: WorkoutSaveRequest = {
            workoutDate: "2026-11-17",
            splitLabel: "Push",
            sourceRoutineFinalId: "final-1",
            programId: "program-1",
            programItemId: "item-1",
            timeAvailableMin: 60,
            durationMin: 50,
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
        }
        await workoutApiClient.save(request)
        expect(mockedAxios.post).toHaveBeenCalledWith("/api/workouts", request)
    })
})
