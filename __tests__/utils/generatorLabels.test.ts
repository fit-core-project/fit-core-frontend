import { describe, expect, it } from "vitest"
import {
    classifyGenerateError,
    generateErrorCopy,
    generateFailedReasonLabel,
    muscleLabel,
    PAIN_AREA_SLUGS,
    TRAINABLE_MUSCLE_SLUGS,
} from "@/utils/displayLabels"
import { assembleRoutineRequest } from "@/utils/requestAssembler"
import { parseBeCondition } from "@/services/userDataService"
import { bodyPartListFor } from "@/app/components/AnatomyModel"

describe("classifyGenerateError", () => {
    it("tells network, http and validation errors apart", () => {
        expect(classifyGenerateError({ isAxiosError: true, code: "ERR_NETWORK", request: {} })).toBe("network")
        expect(classifyGenerateError({ isAxiosError: true, code: "ECONNABORTED" })).toBe("timeout")
        expect(classifyGenerateError({ isAxiosError: true, response: { status: 400 } })).toBe("badRequest")
        expect(classifyGenerateError({ isAxiosError: true, response: { status: 422 } })).toBe("badRequest")
        expect(classifyGenerateError({ isAxiosError: true, response: { status: 429 } })).toBe("rateLimited")
        expect(classifyGenerateError({ isAxiosError: true, response: { status: 503 } })).toBe("server")
        expect(classifyGenerateError({ isAxiosError: true, response: { status: 504 } })).toBe("timeout")
        expect(classifyGenerateError(new Error("[Runtime Guard] routineBlocks array is empty"))).toBe("invalidResponse")
        expect(classifyGenerateError(new Error("boom"))).toBe("unknown")
    })

    it("gives every kind Korean copy and blocks retry only for bad requests", () => {
        expect(generateErrorCopy("badRequest").retryable).toBe(false)
        expect(generateErrorCopy("network").retryable).toBe(true)
        expect(generateErrorCopy("network").title).not.toBe(generateErrorCopy("server").title)
        expect(generateErrorCopy("invalidResponse").title).toMatch(/[가-힣]/)
    })

    it("labels the hard-fail reason code", () => {
        expect(generateFailedReasonLabel("emptyCandidate")).toContain("찾지 못했어요")
        expect(generateFailedReasonLabel("somethingNew")).toMatch(/[가-힣]/)
        expect(generateFailedReasonLabel(null)).not.toContain("null")
    })
})

describe("unavailableEquipment blacklist", () => {
    const base = { targetMuscles: ["chest"], painAreas: [], domsData: {} }

    it("never blacklists BODYWEIGHT", () => {
        expect(assembleRoutineRequest({ ...base, equipment: ["BARBELL"] }).unavailableEquipment).not.toContain("BODYWEIGHT")
        expect(assembleRoutineRequest({ ...base, equipment: ["BODYWEIGHT"] }).unavailableEquipment).not.toContain("BODYWEIGHT")
    })

    it("blacklists all weighted gear when none is selected", () => {
        expect([...assembleRoutineRequest({ ...base, equipment: [] }).unavailableEquipment].sort()).toEqual([
            "BARBELL",
            "CABLE",
            "DUMBBELL",
            "MACHINE",
        ])
    })

    it("is unaffected by a BODYWEIGHT entry", () => {
        const withBw = assembleRoutineRequest({ ...base, equipment: ["DUMBBELL", "BODYWEIGHT"] }).unavailableEquipment
        const without = assembleRoutineRequest({ ...base, equipment: ["DUMBBELL"] }).unavailableEquipment
        expect(withBw).toEqual(without)
    })
})

describe("body part list", () => {
    it("uses SSOT slugs with Korean labels", () => {
        for (const slug of [...TRAINABLE_MUSCLE_SLUGS, ...PAIN_AREA_SLUGS]) expect(muscleLabel(slug), slug).not.toBe("기타 부위")
        expect(new Set(PAIN_AREA_SLUGS).size).toBe(22)
        expect(PAIN_AREA_SLUGS).toHaveLength(22)
        expect(new Set(TRAINABLE_MUSCLE_SLUGS).size).toBe(18)
    })

    it("adds selected or locked parts the vocabulary does not list", () => {
        const parts = bodyPartListFor("doms", { "side-deltoids": 1, chest: 2 }, ["knees"])
        expect(parts).toContain("side-deltoids")
        expect(parts).toContain("knees")
        expect(parts.filter((p) => p === "chest")).toHaveLength(1)
        expect(bodyPartListFor("injury", {}, [])).toEqual([...PAIN_AREA_SLUGS])
    })
})

describe("parseBeCondition", () => {
    it("throws instead of returning empty pain areas for a malformed body", () => {
        expect(() => parseBeCondition(null)).toThrow()
        expect(() => parseBeCondition({ painAreas: null, doms: [] })).toThrow()
        expect(() => parseBeCondition({ painAreas: [] })).toThrow()
    })

    it("maps levels", () => {
        const parsed = parseBeCondition({
            painAreas: ["lower-back"],
            doms: [
                { bodyPart: "chest", level: "mild", recordedAt: null },
                { bodyPart: "quadriceps", level: "moderate", recordedAt: null },
                { bodyPart: "hamstring", level: "severe", recordedAt: null },
            ],
        })
        expect(parsed.painAreas).toEqual(["lower-back"])
        expect(parsed.doms).toEqual({ chest: 1, quadriceps: 2, hamstring: 2 })
    })
})
