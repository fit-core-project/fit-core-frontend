import { describe, expect, it } from "vitest"
import type { BodyComposition } from "@/types/project"
import { KG_TO_LBS, roundKg, toDisplayValues, toStoredValues } from "@/app/my/body-composition/bodyCompositionUnits"

const stored: BodyComposition = { measuredAt: "2026-05-20", sourceVendor: "demo", bodyWeightKg: 82.4, skeletalMuscleMassKg: 39.1, bodyFatPct: 14.8 }

describe("toDisplayValues", () => {
    it("keeps kg values and all other fields as-is", () => {
        expect(toDisplayValues(stored, "kg")).toEqual(stored)
    })

    it("converts weights to lbs with one decimal", () => {
        const display = toDisplayValues(stored, "lbs")
        expect(display.bodyWeightKg).toBe(181.7)
        expect(display.skeletalMuscleMassKg).toBe(86.2)
        expect(display.bodyFatPct).toBe(14.8)
        expect(display.sourceVendor).toBe("demo")
    })
})

describe("toStoredValues", () => {
    it("passes kg form values through", () => {
        expect(toStoredValues({ ...stored, bodyWeightKg: 80 }, "kg")).toEqual({ ...stored, bodyWeightKg: 80 })
    })

    it("keeps untouched weights exactly when editing in lbs", () => {
        const display = toDisplayValues(stored, "lbs")
        const result = toStoredValues({ ...display, bodyFatPct: 14.0 }, "lbs", { stored, display })
        expect(result.bodyWeightKg).toBe(82.4)
        expect(result.skeletalMuscleMassKg).toBe(39.1)
        expect(result.bodyFatPct).toBe(14.0)
    })

    it("converts a changed weight from lbs", () => {
        const display = toDisplayValues(stored, "lbs")
        const result = toStoredValues({ ...display, bodyWeightKg: 180 }, "lbs", { stored, display })
        expect(result.bodyWeightKg).toBe(81.65) // 180 lb, stored with two decimals
        expect(result.skeletalMuscleMassKg).toBe(39.1)
    })

    it("converts every weight for a new record in lbs", () => {
        const result = toStoredValues({ measuredAt: "2026-05-21", bodyWeightKg: 180 }, "lbs")
        expect(result.bodyWeightKg).toBe(81.65) // 180 lb, stored with two decimals
    })
})

describe("roundKg", () => {
    it("keeps two decimals for converted weights", () => {
        expect(roundKg(176.4 / KG_TO_LBS)).toBe(80.01)
    })
})
