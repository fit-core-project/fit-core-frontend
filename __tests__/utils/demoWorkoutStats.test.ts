import { describe, expect, it } from "vitest"
import { demoAttendance, demoPrs } from "@/utils/demoWorkoutStats"
import type { WorkoutSessionResponse } from "@/types/project"

const session = (date: string, sets: Array<{ id: string; w: number; r: number; type?: string }>) =>
    ({
        workoutDate: date,
        sets: sets.map((s, i) => ({
            id: `${date}-${i}`, exerciseOrder: 1, exerciseId: s.id, exerciseNameSnapshot: `ex-${s.id}`, setIndex: i + 1,
            setType: s.type ?? "working", trackingMode: "weightReps", weightKg: s.w, reps: s.r, rpe: 8, rir: 2,
        })),
    }) as unknown as WorkoutSessionResponse

describe("demoPrs", () => {
    it("keeps the best Epley 1RM per exercise over working sets with a weight", () => {
        const prs = demoPrs([
            session("2026-11-10", [{ id: "1", w: 60, r: 10 }, { id: "2", w: 100, r: 5 }]),
            session("2026-11-12", [{ id: "1", w: 70, r: 5 }, { id: "1", w: 200, r: 1, type: "warmup" }, { id: "3", w: 0, r: 12 }]),
        ])
        expect(prs.map((p) => p.exerciseId)).toEqual(["2", "1"])
        expect(prs.find((p) => p.exerciseId === "1")).toMatchObject({ estimated1RM: 81.7, weightKg: 70, reps: 5, achievedDate: "2026-11-12" })
    })
})

describe("demoAttendance", () => {
    it("counts distinct workout days in the last 4 Mon-Sun weeks", () => {
        const weeks = demoAttendance(
            [session("2026-11-17", []), session("2026-11-17", []), session("2026-11-16", []), session("2026-11-03", [])],
            "2026-11-18",
            4,
        )
        expect(weeks).toHaveLength(4)
        expect(weeks[3]).toMatchObject({ weekStart: "2026-11-16", weekEnd: "2026-11-22", actualDays: 2, rate: 0.5 })
        expect(weeks[1]).toMatchObject({ weekStart: "2026-11-02", actualDays: 1 })
        expect(demoAttendance([], "2026-11-18", null)[0].rate).toBeNull()
    })
})
