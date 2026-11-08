import { describe, expect, it } from "vitest"
import { lineForRoutine } from "@/utils/routeLine"

describe("lineForRoutine", () => {
    it.each([
        ["push", "push"],
        ["chest", "push"],
        ["shoulder", "push"],
        ["pull", "pull"],
        ["back", "pull"],
        ["legs", "legs"],
        ["lower", "legs"],
        ["core", "core"],
        ["neck", "core"],
        ["full_body", "core"],
    ])("maps direct split %s to %s", (split, line) => {
        expect(lineForRoutine(split)).toBe(line)
    })

    it("normalizes case and whitespace", () => {
        expect(lineForRoutine(" PUSH ")).toBe("push")
    })

    it("resolves a mixed split by its muscle majority", () => {
        expect(lineForRoutine("upper", ["chest", "triceps", "biceps"])).toBe("push")
        expect(lineForRoutine("custom", ["quadriceps", "gluteal"])).toBe("legs")
    })

    it("groups lower-back with the core preset", () => {
        expect(lineForRoutine("custom", ["abs", "lower-back"])).toBe("core")
    })

    it("treats side-deltoids as a push detail", () => {
        expect(lineForRoutine("custom", ["side-deltoids"])).toBe("push")
    })

    it("falls back to mixed on a tie, unknown muscles, or no input", () => {
        expect(lineForRoutine("chest_back", ["chest", "upper-back"])).toBe("mixed")
        expect(lineForRoutine("custom", ["head"])).toBe("mixed")
        expect(lineForRoutine(null)).toBe("mixed")
        expect(lineForRoutine(undefined, [])).toBe("mixed")
    })
})
