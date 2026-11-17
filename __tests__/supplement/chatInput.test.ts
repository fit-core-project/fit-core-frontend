import { describe, expect, it } from "vitest"
import { restoreCanceledQuestion } from "@/utils/supplementChatInput"

describe("restoreCanceledQuestion (P2-8)", () => {
    it("puts the canceled question back into an empty input", () => {
        expect(restoreCanceledQuestion("", "마그네슘 언제 먹어요?")).toBe("마그네슘 언제 먹어요?")
        expect(restoreCanceledQuestion("   ", "질문")).toBe("질문")
    })
    it("keeps what the user is typing", () => {
        expect(restoreCanceledQuestion("새로 쓰는 중", "이전 질문")).toBe("새로 쓰는 중")
    })
})
