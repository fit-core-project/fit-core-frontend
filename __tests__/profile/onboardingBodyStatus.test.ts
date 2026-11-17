import { describe, expect, it } from "vitest"
import {
    buildBodyStatusUpdate,
    buildPainAreas,
    initialPainSelection,
    parseBodyWeight,
    togglePainArea,
    withTodayWeight,
} from "@/app/onboarding/bodyStatus"
import { demoProfile, mergeProfileUpdate } from "@/utils/demoMode"
import { PAIN_AREA_SLUGS } from "@/utils/displayLabels"

const TODAY = "2026-11-17"

const stored = {
    painAreas: [{ area: "lower-back", note: "데드리프트 후 피로" }],
    bodyCompositionSnapshot: [
        { measuredAt: "2026-11-01", source: "manual", bodyWeightKg: 80, skeletalMuscleMassKg: 35 },
        { measuredAt: "2026-10-01", source: "manual", bodyWeightKg: 81 },
    ],
}

describe("onboarding 몸 상태 step: pain areas", () => {
    it("omits painAreas when the question was not answered (merge keeps the stored list)", () => {
        const request = buildBodyStatusUpdate({ painSelection: null, weightKg: 72, profile: stored, today: TODAY })
        expect(request).not.toBeNull()
        expect(request).not.toHaveProperty("painAreas")
    })

    it("sends [] for 없어요 so the stored list is cleared", () => {
        const request = buildBodyStatusUpdate({ painSelection: [], weightKg: null, profile: stored, today: TODAY })
        expect(request).toEqual({ painAreas: [] })
    })

    it("keeps the saved note of a part that stays selected", () => {
        expect(buildPainAreas(["lower-back", "knees"], stored.painAreas)).toEqual([
            { area: "lower-back", note: "데드리프트 후 피로" },
            { area: "knees", note: "" },
        ])
    })

    it("toggles SSOT slugs and treats removing the last part as 없어요", () => {
        const one = togglePainArea(null, "knees")
        expect(one).toEqual(["knees"])
        expect(togglePainArea(one, "knees")).toEqual([])
        expect(one.every((slug) => (PAIN_AREA_SLUGS as readonly string[]).includes(slug))).toBe(true)
    })

    it("prefills a saved list and leaves an empty one unanswered", () => {
        expect(initialPainSelection(stored)).toEqual(["lower-back"])
        expect(initialPainSelection({ painAreas: [] })).toBeNull()
        expect(initialPainSelection(null)).toBeNull()
    })
})

describe("onboarding 몸 상태 step: body weight", () => {
    it("parses empty as not entered and rejects out-of-range values", () => {
        expect(parseBodyWeight("")).toEqual({ ok: true, value: null })
        expect(parseBodyWeight(" 72.36 ")).toEqual({ ok: true, value: 72.4 })
        expect(parseBodyWeight("10").ok).toBe(false)
        expect(parseBodyWeight("301").ok).toBe(false)
        expect(parseBodyWeight("abc").ok).toBe(false)
    })

    it("sets bodyWeightKg and appends today's entry to the full stored list, newest first", () => {
        const request = buildBodyStatusUpdate({ painSelection: null, weightKg: 72, profile: stored, today: TODAY })
        expect(request?.bodyWeightKg).toBe(72)
        expect(request?.bodyCompositionSnapshot).toEqual([
            { measuredAt: TODAY, source: "manual", bodyWeightKg: 72 },
            ...stored.bodyCompositionSnapshot,
        ])
    })

    it("updates a same-day entry instead of adding a second one, keeping its other measurements", () => {
        const first = withTodayWeight(stored.bodyCompositionSnapshot, 72, "2026-11-01")
        expect(first).toHaveLength(2)
        expect(first[0]).toEqual({ measuredAt: "2026-11-01", source: "manual", bodyWeightKg: 72, skeletalMuscleMassKg: 35 })

        const once = withTodayWeight(stored.bodyCompositionSnapshot, 72, TODAY)
        const again = withTodayWeight(once, 71.5, TODAY)
        expect(again).toHaveLength(3)
        expect(again.filter((item) => item.measuredAt === TODAY)).toEqual([{ measuredAt: TODAY, source: "manual", bodyWeightKg: 71.5 }])
    })

    it("treats a null snapshot list (BE returns null for empty) as empty", () => {
        expect(withTodayWeight(null, 70, TODAY)).toEqual([{ measuredAt: TODAY, source: "manual", bodyWeightKg: 70 }])
    })

    it("never sends a partial snapshot list when the profile was not loaded", () => {
        const request = buildBodyStatusUpdate({ painSelection: null, weightKg: 72, profile: null, today: TODAY })
        expect(request).toEqual({ bodyWeightKg: 72 })
    })

    it("returns null when there is nothing to save", () => {
        expect(buildBodyStatusUpdate({ painSelection: null, weightKg: null, profile: stored, today: TODAY })).toBeNull()
    })
})

describe("onboarding 몸 상태 step: demo parity", () => {
    it("merges into the demo profile without dropping history or other fields", () => {
        const request = buildBodyStatusUpdate({ painSelection: ["knees"], weightKg: 79.5, profile: demoProfile, today: TODAY })
        expect(request).not.toBeNull()
        const merged = mergeProfileUpdate(demoProfile, request!)
        expect(merged.painAreas).toEqual([{ area: "knees", note: "" }])
        expect(merged.bodyWeightKg).toBe(79.5)
        expect(merged.bodyCompositionSnapshot).toHaveLength((demoProfile.bodyCompositionSnapshot ?? []).length + 1)
        expect(merged.bodyCompositionSnapshot?.[0]).toEqual({ measuredAt: TODAY, source: "manual", bodyWeightKg: 79.5 })
        expect(merged.goalType).toBe(demoProfile.goalType)
        expect(merged.nickname).toBe(demoProfile.nickname)
    })
})
