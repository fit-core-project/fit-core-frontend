import { describe, expect, it } from "vitest"
import type { RoutineBlock } from "@/types/routine"
import {
    DRAFT_INVALID_MESSAGE,
    DRAFT_WEIGHT_MESSAGE,
    displayToStoredKg,
    draftInvalidReason,
    formatWeight,
    kgToDisplay,
    parseSetInput,
} from "@/app/routine/draft/draftEditing"

const block = (overrides: Partial<RoutineBlock> = {}): RoutineBlock => ({
    order: 1,
    exerciseId: "12",
    exerciseName: "벤치프레스",
    exerciseRationale: "",
    prescription: [{ setIndex: 1, setType: "working", targetReps: 10, targetWeightKg: 60, targetRir: 2, targetRestSec: 90 }],
    ...overrides,
})

describe("draftInvalidReason", () => {
    it("rejects a routine with zero exercises", () => {
        expect(draftInvalidReason([])).toBe("noExercises")
    })

    it("rejects a block whose exercise was never picked", () => {
        expect(draftInvalidReason([block(), block({ exerciseId: "" })])).toBe("emptyExercise")
        expect(draftInvalidReason([block({ exerciseId: "  " })])).toBe("emptyExercise")
    })

    it("rejects a block without sets and out-of-range sets", () => {
        expect(draftInvalidReason([block({ prescription: [] })])).toBe("noSets")
        const bad = block()
        bad.prescription = [{ ...bad.prescription[0], targetReps: 0 }]
        expect(draftInvalidReason([bad])).toBe("setOutOfRange")
        bad.prescription = [{ ...bad.prescription[0], targetReps: 10, targetWeightKg: 501 }]
        expect(draftInvalidReason([bad])).toBe("setOutOfRange")
    })

    it("accepts a valid routine, including bodyweight sets", () => {
        const bw = block()
        bw.prescription = [{ ...bw.prescription[0], targetWeightKg: null }]
        expect(draftInvalidReason([block(), bw])).toBeNull()
    })
})

describe("weight units", () => {
    it("round-trips every whole lbs value without drift", () => {
        for (let lbs = 1; lbs <= 1102; lbs++) {
            const kg = displayToStoredKg(lbs, "lbs")
            expect(Number.isInteger(Math.round(kg * 10))).toBe(true)
            expect(kgToDisplay(kg, "lbs"), `${lbs} lbs`).toBe(lbs)
        }
    })

    it("stores kg with one decimal and never re-rounds it for display", () => {
        expect(displayToStoredKg(62.5, "kg")).toBe(62.5)
        expect(displayToStoredKg(62.54, "kg")).toBe(62.5)
        expect(formatWeight(62.5, "kg")).toBe("62.5")
        expect(formatWeight(null, "lbs")).toBe("")
    })
})

describe("parseSetInput", () => {
    it("treats an empty weight as bodyweight", () => {
        expect(parseSetInput("weight", "")).toEqual({ ok: true, value: null })
    })

    it("converts lbs input to stored kg", () => {
        expect(parseSetInput("weight", "135", "lbs")).toEqual({ ok: true, value: 61.2 })
    })

    it("rejects empty or out-of-range reps and rest", () => {
        expect(parseSetInput("reps", "").ok).toBe(false)
        expect(parseSetInput("reps", "51").ok).toBe(false)
        expect(parseSetInput("reps", "8.5").ok).toBe(false)
        expect(parseSetInput("reps", "12")).toEqual({ ok: true, value: 12 })
        expect(parseSetInput("rest", "")).toMatchObject({ ok: false })
        expect(parseSetInput("rest", "0")).toEqual({ ok: true, value: 0 })
        expect(parseSetInput("weight", "abc").ok).toBe(false)
    })

    it("treats 0 as bodyweight, like the player, and rejects negative or over-500kg weights", () => {
        expect(parseSetInput("weight", "0")).toEqual({ ok: true, value: null })
        expect(parseSetInput("weight", "0", "lbs")).toEqual({ ok: true, value: null })
        expect(parseSetInput("weight", "500")).toEqual({ ok: true, value: 500 })
        expect(parseSetInput("weight", "-1")).toEqual({ ok: false, message: DRAFT_WEIGHT_MESSAGE })
        expect(parseSetInput("weight", "500.1")).toEqual({ ok: false, message: DRAFT_WEIGHT_MESSAGE })
    })

    it("uses the same weight rule in the banner, the parse error and the save check", () => {
        expect(DRAFT_WEIGHT_MESSAGE).toContain("0~500kg")
        expect(DRAFT_WEIGHT_MESSAGE).toContain("맨몸")
        expect(DRAFT_INVALID_MESSAGE.setOutOfRange).toContain("0~500kg(0은 맨몸)")
        const zero = block()
        zero.prescription = [{ ...zero.prescription[0], targetWeightKg: 0 }]
        expect(draftInvalidReason([zero])).toBeNull()
        const negative = block()
        negative.prescription = [{ ...negative.prescription[0], targetWeightKg: -5 }]
        expect(draftInvalidReason([negative])).toBe("setOutOfRange")
        expect(formatWeight(0, "kg")).toBe("")
    })
})
