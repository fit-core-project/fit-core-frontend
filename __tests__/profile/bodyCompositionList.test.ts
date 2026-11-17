import { describe, expect, it } from "vitest"
import type { BodyComposition } from "@/types/project"
import {
    addBodyComposition,
    removeBodyComposition,
    replaceBodyComposition,
    sortBodyCompositions,
} from "@/app/my/body-composition/bodyCompositionList"
import { demoProfile, mergeProfileUpdate } from "@/utils/demoMode"

const may20: BodyComposition = { measuredAt: "2026-05-20", bodyWeightKg: 82.4 }
const may06: BodyComposition = { measuredAt: "2026-05-06", bodyWeightKg: 82.7 }
const apr20: BodyComposition = { measuredAt: "2026-04-20", bodyWeightKg: 83.1 }
// Two records on the same day, told apart only by position.
const sameDayA: BodyComposition = { measuredAt: "2026-05-06", bodyWeightKg: 90, source: "A" }
const undated: BodyComposition = { bodyFatPct: 15 }

describe("sortBodyCompositions", () => {
    it("orders newest first with undated records last, without mutating the input", () => {
        const input = [apr20, undated, may20, may06]
        expect(sortBodyCompositions(input)).toEqual([may20, may06, apr20, undated])
        expect(input).toEqual([apr20, undated, may20, may06])
    })

    it("keeps equal dates in their original order and handles null/undefined", () => {
        expect(sortBodyCompositions([may06, sameDayA])).toEqual([may06, sameDayA])
        expect(sortBodyCompositions(null)).toEqual([])
        expect(sortBodyCompositions(undefined)).toEqual([])
    })
})

describe("addBodyComposition", () => {
    it("returns the full list sorted with the new record in place", () => {
        expect(addBodyComposition([may20, apr20], may06)).toEqual([may20, may06, apr20])
        expect(addBodyComposition(null, may06)).toEqual([may06])
    })
})

describe("replaceBodyComposition", () => {
    it("edits the referenced record even when the stored list is unsorted", () => {
        const edited = { ...may06, bodyWeightKg: 80 }
        // Sorted view: [may20, may06, apr20] -> index 1 is may06.
        const next = replaceBodyComposition([apr20, may06, may20], { index: 1, measuredAt: "2026-05-06" }, edited)
        expect(next).toEqual([may20, edited, apr20])
    })

    it("re-sorts when the edit changes measuredAt", () => {
        const moved = { ...apr20, measuredAt: "2026-06-01" }
        const next = replaceBodyComposition([may20, may06, apr20], { index: 2, measuredAt: "2026-04-20" }, moved)
        expect(next).toEqual([moved, may20, may06])
    })

    it("edits the right one of two same-day records by index", () => {
        const list = [may20, may06, sameDayA, apr20]
        const edited = { ...sameDayA, bodyWeightKg: 91 }
        const next = replaceBodyComposition(list, { index: 2, measuredAt: "2026-05-06" }, edited)
        expect(next).toEqual([may20, may06, edited, apr20])
    })

    it("can edit an undated record", () => {
        const fixed = { ...undated, measuredAt: "2026-05-01" }
        const next = replaceBodyComposition([undated, may20], { index: 1, measuredAt: undefined }, fixed)
        expect(next).toEqual([may20, fixed])
    })

    it("returns null for a stale or out-of-range reference", () => {
        const list = [may20, may06]
        expect(replaceBodyComposition(list, { index: 0, measuredAt: "2026-05-06" }, may06)).toBeNull()
        expect(replaceBodyComposition(list, { index: 5, measuredAt: "2026-05-06" }, may06)).toBeNull()
        expect(replaceBodyComposition(list, { index: -1, measuredAt: "2026-05-20" }, may06)).toBeNull()
    })
})

describe("removeBodyComposition", () => {
    it("deletes only the referenced record", () => {
        expect(removeBodyComposition([apr20, may20, may06], { index: 1, measuredAt: "2026-05-06" })).toEqual([may20, apr20])
    })

    it("deletes the right one of two same-day records by index", () => {
        const list = [may20, may06, sameDayA]
        expect(removeBodyComposition(list, { index: 1, measuredAt: "2026-05-06" })).toEqual([may20, sameDayA])
        expect(removeBodyComposition(list, { index: 2, measuredAt: "2026-05-06" })).toEqual([may20, may06])
    })

    it("returns an empty list when the last record is deleted", () => {
        expect(removeBodyComposition([may20], { index: 0, measuredAt: "2026-05-20" })).toEqual([])
    })

    it("returns null for a stale reference", () => {
        expect(removeBodyComposition([may20], { index: 0, measuredAt: "2026-01-01" })).toBeNull()
        expect(removeBodyComposition([], { index: 0, measuredAt: "2026-05-20" })).toBeNull()
    })
})

describe("demo mode merge with snapshot updates", () => {
    it("clears the stored list when the last record is deleted", () => {
        const current = { ...demoProfile, bodyCompositionSnapshot: [may20] }
        const next = removeBodyComposition(current.bodyCompositionSnapshot, { index: 0, measuredAt: "2026-05-20" })
        expect(mergeProfileUpdate(current, { bodyCompositionSnapshot: next ?? undefined }).bodyCompositionSnapshot).toEqual([])
    })

    it("replaces the stored list with the edited one", () => {
        const current = { ...demoProfile, bodyCompositionSnapshot: [may20, may06] }
        const edited = { ...may20, bodyWeightKg: 81 }
        const next = replaceBodyComposition(current.bodyCompositionSnapshot, { index: 0, measuredAt: "2026-05-20" }, edited)
        expect(mergeProfileUpdate(current, { bodyCompositionSnapshot: next ?? undefined }).bodyCompositionSnapshot).toEqual([
            edited,
            may06,
        ])
    })
})
