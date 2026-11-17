import { describe, expect, it } from "vitest"
import { toAiStatus } from "@/components/AiStatusIndicator"

describe("toAiStatus", () => {
    it("maps the health body", () => {
        expect(toAiStatus(true, { ai: "up", llm: "up" })).toBe("up")
        expect(toAiStatus(true, { ai: "up", llm: "down" })).toBe("limited")
        expect(toAiStatus(true, { ai: "down" })).toBe("down")
        expect(toAiStatus(false, { ai: "up", llm: "up" })).toBe("down")
        expect(toAiStatus(true, null)).toBe("down")
    })
})
