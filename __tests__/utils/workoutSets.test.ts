import { describe, expect, it } from "vitest"
import type { RoutineBlock } from "@/types/routine"
import {
    adjustRest,
    buildSetsPayload,
    clampReps,
    computeDurationMin,
    effortToRpe,
    formatWeight,
    MAX_DURATION_MIN,
    normalizeWeightKg,
    restRemainingSec,
    setKey,
    stepWeight,
    toDisplayWeight,
} from "@/utils/workoutSets"

const block = (overrides: Partial<RoutineBlock> = {}): RoutineBlock => ({
    order: 1,
    exerciseId: "ex_bench",
    exerciseName: "Bench Press",
    exerciseRationale: "",
    prescription: [
        { setIndex: 1, setType: "warmup", targetReps: 10, targetWeightKg: 40, targetRir: 3, targetRestSec: 60 },
        { setIndex: 2, setType: "working", targetReps: 8, targetWeightKg: 60, targetRir: 2, targetRestSec: 90 },
        { setIndex: 3, setType: "", targetReps: 8, targetWeightKg: 60, targetRir: 1, targetRestSec: 90 },
    ],
    ...overrides,
})

describe("weight units", () => {
    it("steps kg by 2.5 on the grid", () => {
        expect(stepWeight(60, "kg", 1)).toBe(62.5)
        expect(stepWeight(60, "kg", -1)).toBe(57.5)
        expect(stepWeight(61, "kg", 1)).toBe(62.5)
        expect(stepWeight(61, "kg", -1)).toBe(60)
    })

    it("steps lbs by 5 without drift and stores kg", () => {
        const up = stepWeight(60, "lbs", 1) // 132.3lb -> 135lb
        expect(toDisplayWeight(up as number, "lbs")).toBe(135)
        let kg: number | null = up
        for (let i = 0; i < 10; i++) kg = stepWeight(kg, "lbs", 1)
        expect(toDisplayWeight(kg as number, "lbs")).toBe(185)
        for (let i = 0; i < 10; i++) kg = stepWeight(kg, "lbs", -1)
        expect(toDisplayWeight(kg as number, "lbs")).toBe(135)
    })

    it("treats stepping to zero as bodyweight and caps at 500kg", () => {
        expect(stepWeight(2.5, "kg", -1)).toBeNull()
        expect(stepWeight(null, "kg", 1)).toBe(2.5)
        expect(stepWeight(500, "kg", 1)).toBe(500)
        expect(normalizeWeightKg(0)).toBeNull()
        expect(normalizeWeightKg(600)).toBe(500)
    })

    it("formats weights in the user's unit", () => {
        expect(formatWeight(60, "kg")).toBe("60kg")
        expect(formatWeight(60, "lbs")).toBe("132.3lb")
        expect(formatWeight(null, "kg")).toBe("맨몸")
        expect(formatWeight(0, "lbs")).toBe("맨몸")
    })

    it("clamps reps to the backend range", () => {
        expect(clampReps(0)).toBe(1)
        expect(clampReps(70)).toBe(50)
        expect(clampReps(Number.NaN)).toBe(1)
    })
})

describe("buildSetsPayload", () => {
    it("keeps only checked sets with actual values and 1-based indices", () => {
        const blocks = [block(), block({ exerciseId: "ex_row", exerciseName: "Row" })]
        const checked = new Set([setKey(0, 0), setKey(0, 2), setKey(1, 1)])
        const sets = buildSetsPayload(blocks, checked, { [setKey(0, 2)]: { weightKg: 62.5, reps: 6, isFailure: true } }, 8)
        expect(sets).toHaveLength(3)
        expect(sets[0]).toMatchObject({ exerciseOrder: 1, setIndex: 1, setType: "warmup", weightKg: 40, reps: 10, isFailure: false, rpe: 8 })
        expect(sets[1]).toMatchObject({ exerciseOrder: 1, setIndex: 3, setType: "working", weightKg: 62.5, reps: 6, isFailure: true })
        expect(sets[2]).toMatchObject({ exerciseOrder: 2, exerciseId: "ex_row", setIndex: 2, weightKg: 60, reps: 8 })
    })

    it("saves an untouched target exactly in kg (display unit never rewrites stored values)", () => {
        const sets = buildSetsPayload([block()], new Set([setKey(0, 1)]), {}, 8)
        expect(sets[0].weightKg).toBe(60)
    })

    it("sends bodyweight as null, never 0", () => {
        const bw = block({ prescription: [{ setIndex: 1, setType: "working", targetReps: 12, targetWeightKg: 0, targetRir: 2, targetRestSec: 60 }] })
        const sets = buildSetsPayload([bw], new Set([setKey(0, 0)]), {}, null)
        expect(sets[0].weightKg).toBeNull()
    })

    it("returns nothing when no set is checked", () => {
        expect(buildSetsPayload([block()], new Set(), {}, 8)).toEqual([])
    })
})

describe("effort and duration", () => {
    it("maps the 3-choice rating to RPE 6/8/10", () => {
        expect(effortToRpe(1)).toBe(6)
        expect(effortToRpe(2)).toBe(8)
        expect(effortToRpe(3)).toBe(10)
    })

    it("computes duration from the persisted start, clamped", () => {
        const start = 1_000_000
        expect(computeDurationMin(start, start + 45 * 60_000)).toBe(45)
        expect(computeDurationMin(start, start + 10_000)).toBe(1)
        expect(computeDurationMin(start, start + 3 * 24 * 60 * 60_000)).toBe(MAX_DURATION_MIN)
    })
})

describe("rest timer", () => {
    it("computes remaining time, frozen while paused", () => {
        expect(restRemainingSec({ endsAt: 10_000, pausedAt: null }, 1_000)).toBe(9)
        expect(restRemainingSec({ endsAt: 10_000, pausedAt: 4_000 }, 9_999_999)).toBe(6)
        expect(restRemainingSec({ endsAt: 10_000, pausedAt: null }, 20_000)).toBe(0)
    })

    it("adjusts by seconds and never goes below now", () => {
        expect(adjustRest({ endsAt: 60_000, pausedAt: null }, 30, 0).endsAt).toBe(90_000)
        expect(adjustRest({ endsAt: 20_000, pausedAt: null }, -30, 0).endsAt).toBe(0)
        expect(adjustRest({ endsAt: 20_000, pausedAt: 5_000 }, -30, 0).endsAt).toBe(5_000)
    })
})
