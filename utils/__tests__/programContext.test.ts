import { describe, expect, it } from "vitest"
import {
    buildProgramPlayerContext,
    clearProgramContext,
    parseProgramPlayerContext,
    PROGRAM_CONTEXT_STORAGE_KEY,
    readProgramContext,
    readValidProgramContext,
} from "@/utils/programContext"

function storageWith(value: string | null) {
    const store = new Map<string, string>()
    if (value !== null) store.set(PROGRAM_CONTEXT_STORAGE_KEY, value)
    return {
        getItem: (key: string) => store.get(key) ?? null,
        removeItem: (key: string) => store.delete(key),
        hasContext: () => store.has(PROGRAM_CONTEXT_STORAGE_KEY),
    }
}

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

    it("returns valid context when routine final id matches", () => {
        const storage = storageWith(JSON.stringify(buildProgramPlayerContext("program-1", "item-1", "final-1")))

        expect(readValidProgramContext("final-1", storage)).toEqual({
            programId: "program-1",
            programItemId: "item-1",
            routineFinalId: "final-1",
        })
        expect(storage.hasContext()).toBe(true)
    })

    it("clears context when routine final id mismatches", () => {
        const storage = storageWith(JSON.stringify(buildProgramPlayerContext("program-1", "item-1", "final-1")))

        expect(readValidProgramContext("final-2", storage)).toBeNull()
        expect(storage.hasContext()).toBe(false)
    })

    it("clears malformed context", () => {
        const storage = storageWith(JSON.stringify({ programId: "program-1" }))

        expect(readValidProgramContext("final-1", storage)).toBeNull()
        expect(storage.hasContext()).toBe(false)
    })

    it("reads and clears context explicitly", () => {
        const storage = storageWith(JSON.stringify(buildProgramPlayerContext("program-1", "item-1", "final-1")))

        expect(readProgramContext(storage)?.programId).toBe("program-1")
        clearProgramContext(storage)
        expect(storage.hasContext()).toBe(false)
    })
})
