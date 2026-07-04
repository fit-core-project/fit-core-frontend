import { describe, expect, it } from "vitest"
import { buildProgramPlayerContext, parseProgramPlayerContext } from "@/utils/programContext"

describe("program player context", () => {
    it("parses valid program context", () => {
        const raw = JSON.stringify({
            programId: "program-1",
            programItemId: "item-1",
            routineFinalId: "final-1",
        })

        expect(parseProgramPlayerContext(raw)).toEqual({
            programId: "program-1",
            programItemId: "item-1",
            routineFinalId: "final-1",
        })
    })

    it("returns null for missing or malformed context", () => {
        expect(parseProgramPlayerContext(null)).toBeNull()
        expect(parseProgramPlayerContext("{")).toBeNull()
        expect(parseProgramPlayerContext(JSON.stringify({ programId: "program-1" }))).toBeNull()
    })

    it("builds the exact context shape saved before player navigation", () => {
        expect(buildProgramPlayerContext("program-1", "item-1", "final-1")).toEqual({
            programId: "program-1",
            programItemId: "item-1",
            routineFinalId: "final-1",
        })
    })
})
