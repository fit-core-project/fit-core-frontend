import { describe, expect, it } from "vitest"
import { mergeLoadedDoms } from "@/app/ai_routine/conditionDoms"

describe("mergeLoadedDoms", () => {
    it("does not resurrect soreness the user cleared before a retried load", () => {
        // The user tapped chest to 1 and cycled it back to 0, which deletes the key.
        const touched = new Set(["chest"])
        expect(mergeLoadedDoms({ chest: 2 }, {}, touched)).toEqual({})
    })

    it("fills muscles the user never touched from the loaded condition", () => {
        expect(mergeLoadedDoms({ chest: 2, lats: 1 }, {}, new Set())).toEqual({ chest: 2, lats: 1 })
    })

    it("keeps the user's tapped value over the loaded one", () => {
        const touched = new Set(["chest"])
        expect(mergeLoadedDoms({ chest: 2, lats: 1 }, { chest: 1 }, touched)).toEqual({ chest: 1, lats: 1 })
    })
})
