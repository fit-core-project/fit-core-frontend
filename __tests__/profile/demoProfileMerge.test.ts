import { describe, expect, it } from "vitest"
import { demoProfile, mergeProfileUpdate } from "@/utils/demoMode"

describe("mergeProfileUpdate (demo parity with BE merge)", () => {
    it("keeps stored values for undefined or null keys", () => {
        const merged = mergeProfileUpdate(
            { ...demoProfile, nickname: "헬린이", birthDate: "1995-03-02" },
            { goalType: "strength", birthDate: undefined }
        )
        expect(merged.goalType).toBe("strength")
        expect(merged.nickname).toBe("헬린이")
        expect(merged.birthDate).toBe("1995-03-02")
    })

    it("clears a list when an empty array is sent", () => {
        const merged = mergeProfileUpdate({ ...demoProfile, painAreas: [{ area: "knee", note: "" }] }, { painAreas: [] })
        expect(merged.painAreas).toEqual([])
    })
})
