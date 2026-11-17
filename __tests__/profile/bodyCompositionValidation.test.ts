import { describe, expect, it } from "vitest"
import {
    hasBodyCompositionErrors,
    toKstDateString,
    validateBodyComposition,
    validateExtraRange,
} from "@/app/my/body-composition/bodyCompositionValidation"

const TODAY = "2026-11-16"

describe("validateBodyComposition", () => {
    it("accepts a dated record with one measurement", () => {
        const errors = validateBodyComposition({ measuredAt: "2026-11-10", bodyWeightKg: 70 }, "kg", TODAY)
        expect(hasBodyCompositionErrors(errors)).toBe(false)
    })

    it("requires measuredAt", () => {
        expect(validateBodyComposition({ bodyWeightKg: 70 }, "kg", TODAY).measuredAt).toBeDefined()
        expect(validateBodyComposition({ measuredAt: "  ", bodyWeightKg: 70 }, "kg", TODAY).measuredAt).toBeDefined()
    })

    it("rejects a future or malformed date", () => {
        expect(validateBodyComposition({ measuredAt: "2026-11-17", bodyWeightKg: 70 }, "kg", TODAY).measuredAt).toBeDefined()
        expect(validateBodyComposition({ measuredAt: "11/10/2026", bodyWeightKg: 70 }, "kg", TODAY).measuredAt).toBeDefined()
    })

    it("requires at least one measurement (source alone is not enough)", () => {
        const errors = validateBodyComposition({ measuredAt: "2026-11-10", source: "인바디" }, "kg", TODAY)
        expect(errors.measurements).toBeDefined()
    })

    it("validates ranges for the extra fields", () => {
        const errors = validateBodyComposition(
            { measuredAt: "2026-11-10", bodyFatMassKg: 0.1, fatFreeMassKg: 300, visceralFatLevel: 3.5, waistHipRatio: 2 },
            "kg",
            TODAY
        )
        expect(Object.keys(errors).sort()).toEqual(["bodyFatMassKg", "fatFreeMassKg", "visceralFatLevel", "waistHipRatio"])
    })

    it("checks weight fields in kg when the display unit is lbs", () => {
        // 400 lbs ≈ 181 kg: within 0.5–200 kg
        expect(validateExtraRange("bodyFatMassKg", 400, "lbs")).toBeUndefined()
        // 450 lbs ≈ 204 kg: above 200 kg
        expect(validateExtraRange("bodyFatMassKg", 450, "lbs")).toBeDefined()
        // ratio is unitless
        expect(validateExtraRange("waistHipRatio", 0.9, "lbs")).toBeUndefined()
    })
})

describe("toKstDateString", () => {
    it("uses the KST calendar day", () => {
        expect(toKstDateString(new Date("2026-11-15T16:00:00Z"))).toBe("2026-11-16")
    })
})
