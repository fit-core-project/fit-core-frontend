import { describe, it, expect } from "vitest"
import type { WorkoutSetSaveRequest } from "@/lib/api/workout/workoutApiClient"
import type { PrResponse } from "@/types/project"
import { buildWorkoutSummary, estimate1Rm, formatDurationMin, formatVolume, roundE1Rm } from "../workoutSummary"

const set = (over: Partial<WorkoutSetSaveRequest>): WorkoutSetSaveRequest => ({
    exerciseOrder: 1,
    exerciseId: "bench",
    exerciseNameSnapshot: "벤치프레스",
    setIndex: 1,
    setType: "working",
    trackingMode: "weightReps",
    weightKg: 60,
    reps: 10,
    rir: null,
    rpe: 8,
    isFailure: false,
    restSec: 90,
    ...over,
})

const pr = (exerciseId: string, estimated1RM: number): PrResponse => ({
    exerciseId,
    exerciseNameSnapshot: exerciseId,
    estimated1RM,
    weightKg: 0,
    reps: 0,
    achievedDate: "2026-11-01",
})

describe("estimate1Rm", () => {
    it("uses Epley like the backend", () => {
        expect(estimate1Rm(60, 10)).toBe(80)
        expect(roundE1Rm(estimate1Rm(62.5, 7))).toBe(77.1)
    })
})

describe("buildWorkoutSummary", () => {
    const sets = [
        set({ setIndex: 1, weightKg: 60, reps: 10 }),
        set({ setIndex: 2, weightKg: 70, reps: 5 }),
        set({ exerciseOrder: 2, exerciseId: "pullup", exerciseNameSnapshot: "턱걸이", setIndex: 1, weightKg: null, reps: 8 }),
        set({ exerciseOrder: 2, exerciseId: "pullup", exerciseNameSnapshot: "턱걸이", setIndex: 2, weightKg: null, reps: 10 }),
    ]

    it("counts sets, duration and volume (bodyweight adds no volume)", () => {
        const summary = buildWorkoutSummary({ durationMin: 42, sets }, [])
        expect(summary.durationMin).toBe(42)
        expect(summary.completedSets).toBe(4)
        expect(summary.totalVolumeKg).toBe(60 * 10 + 70 * 5)
    })

    it("picks the best set by e1RM, or most reps for bodyweight, in exercise order", () => {
        const summary = buildWorkoutSummary({ durationMin: 30, sets: [...sets].reverse() }, [])
        expect(summary.exercises.map((e) => e.exerciseId)).toEqual(["bench", "pullup"])
        // 60×10 → 80.0, 70×5 → 81.7
        expect(summary.exercises[0].bestSet).toEqual({ weightKg: 70, reps: 5, estimated1Rm: 81.7 })
        expect(summary.exercises[0].setCount).toBe(2)
        expect(summary.exercises[1].bestSet).toEqual({ weightKg: null, reps: 10, estimated1Rm: null })
    })

    it("returns null PRs when the previous PRs couldn't be loaded", () => {
        expect(buildWorkoutSummary({ durationMin: 30, sets }, null).newPrs).toBeNull()
    })

    it("marks first weighted records with previous1Rm null and skips bodyweight", () => {
        const newPrs = buildWorkoutSummary({ durationMin: 30, sets }, [])
            .newPrs
        expect(newPrs).toEqual([
            { exerciseId: "bench", exerciseName: "벤치프레스", weightKg: 70, reps: 5, estimated1Rm: 81.7, previous1Rm: null },
        ])
    })

    it("reports a PR only when the rounded e1RM beats the previous one", () => {
        expect(buildWorkoutSummary({ durationMin: 30, sets }, [pr("bench", 81.6)]).newPrs?.[0]?.previous1Rm).toBe(81.6)
        // Same lift as the stored PR (backend rounded 81.666… to 81.7): not a new PR.
        expect(buildWorkoutSummary({ durationMin: 30, sets }, [pr("bench", 81.7)]).newPrs).toEqual([])
        expect(buildWorkoutSummary({ durationMin: 30, sets }, [pr("bench", 90)]).newPrs).toEqual([])
    })

    it("ignores non-working sets for PRs but still counts their volume", () => {
        const warmup = [set({ setType: "warmup", weightKg: 100, reps: 5 }), set({ setIndex: 2, weightKg: 50, reps: 5 })]
        const summary = buildWorkoutSummary({ durationMin: 10, sets: warmup }, [pr("bench", 55)])
        expect(summary.totalVolumeKg).toBe(750)
        expect(summary.newPrs?.[0]).toMatchObject({ weightKg: 50, reps: 5, estimated1Rm: 58.3, previous1Rm: 55 })
    })
})

describe("formatVolume", () => {
    it("shows whole numbers with grouping in the user's unit", () => {
        expect(formatVolume(4250, "kg")).toBe("4,250kg")
        expect(formatVolume(1000, "lbs")).toBe("2,205lb")
        expect(formatVolume(0, "kg")).toBe("0kg")
    })
})

describe("formatDurationMin", () => {
    it("formats minutes in Korean", () => {
        expect(formatDurationMin(45)).toBe("45분")
        expect(formatDurationMin(60)).toBe("1시간")
        expect(formatDurationMin(65)).toBe("1시간 5분")
    })
})
