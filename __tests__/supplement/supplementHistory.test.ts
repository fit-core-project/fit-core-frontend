import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { DEMO_AI_NOTICE, demoSupplementAnswer } from "@/utils/demoSupplementAi"
import {
    buildSupplementHistory,
    isNewTopic,
    resolveDemoFollowUpQuestion,
    SUPPLEMENT_HISTORY_MAX_CONTENT_CHARS,
    SUPPLEMENT_HISTORY_MAX_TURNS,
    WELCOME_MESSAGE_ID,
    type ChatMessageLike,
    type SupplementHistoryTurn,
} from "@/utils/supplementHistory"

const welcome: ChatMessageLike = { id: WELCOME_MESSAGE_ID, role: "ai", content: "복용 정보와 주의사항을 참고용으로 정리해 줘요." }

describe("buildSupplementHistory", () => {
    it("returns an empty history for a fresh chat", () => {
        expect(buildSupplementHistory([welcome])).toEqual([])
        expect(buildSupplementHistory([])).toEqual([])
    })

    it("maps roles and keeps real turns in order", () => {
        const history = buildSupplementHistory([
            welcome,
            { id: "1", role: "user", content: "  마그네슘 먹어도 돼?  " },
            { id: "2", role: "ai", content: "저녁에 먹는 경우가 많아요." },
        ])
        expect(history).toEqual([
            { role: "user", content: "마그네슘 먹어도 돼?" },
            { role: "assistant", content: "저녁에 먹는 경우가 많아요." },
        ])
    })

    it("drops error bubbles and demo answers but keeps the question that failed", () => {
        const history = buildSupplementHistory([
            { id: "1", role: "user", content: "철분 언제 먹어요?" },
            { id: "2", role: "ai", content: "응답이 늦어요. 다시 보내 주세요.", isError: true },
            { id: "3", role: "user", content: "크레아틴은요?" },
            { id: "4", role: "ai", content: `[${DEMO_AI_NOTICE}] 실제 AI 상담이 아니라 미리 준비한 예시예요.\n\n크레아틴` },
        ])
        expect(history).toEqual([
            { role: "user", content: "철분 언제 먹어요?" },
            { role: "user", content: "크레아틴은요?" },
        ])
    })

    it("excludes the resent question and its error bubble on 다시 보내기", () => {
        const messages: ChatMessageLike[] = [
            welcome,
            { id: "1", role: "user", content: "마그네슘 먹어도 돼?" },
            { id: "2", role: "ai", content: "네, 저녁에 많이 먹어요." },
            { id: "3", role: "user", content: "그럼 몇 시에 먹어요?" },
            { id: "4", role: "ai", content: "연결이 끊겼어요.", isError: true },
        ]
        expect(buildSupplementHistory(messages, ["4", "3"])).toEqual([
            { role: "user", content: "마그네슘 먹어도 돼?" },
            { role: "assistant", content: "네, 저녁에 많이 먹어요." },
        ])
    })

    it("keeps at most 12 turns, each trimmed to 500 chars, and skips empty ones", () => {
        const messages: ChatMessageLike[] = Array.from({ length: 16 }, (_, i) => ({
            id: String(i),
            role: i % 2 === 0 ? "user" : "ai",
            content: i === 15 ? "가".repeat(900) : `turn ${i}`,
        }))
        messages.push({ id: "blank", role: "user", content: "   " })
        const history = buildSupplementHistory(messages)
        expect(history).toHaveLength(SUPPLEMENT_HISTORY_MAX_TURNS)
        // the 4 oldest assistant answers go first, so every user turn is still there
        expect(history.filter((t) => t.role === "user")).toHaveLength(8)
        expect(history[0]).toEqual({ role: "user", content: "turn 0" })
        expect(history.at(-1)?.content).toHaveLength(SUPPLEMENT_HISTORY_MAX_CONTENT_CHARS)
    })
})

describe("resolveDemoFollowUpQuestion", () => {
    const history: SupplementHistoryTurn[] = [
        { role: "user", content: "마그네슘 먹어도 돼?" },
        { role: "assistant", content: "오메가3 얘기는 아니에요." },
    ]

    it("borrows the supplement of the most recent user turn", () => {
        const effective = resolveDemoFollowUpQuestion("그럼 몇 시에 먹어요?", history)
        expect(effective).toBe("마그네슘 관련 추가 질문: 그럼 몇 시에 먹어요?")
        expect(demoSupplementAnswer(effective).answer).toContain("마그네슘\n")
    })

    it("leaves a question that names its own supplement alone", () => {
        expect(resolveDemoFollowUpQuestion("철분은요?", history)).toBe("철분은요?")
    })

    it("leaves the question alone without history or a supplement in user turns", () => {
        expect(resolveDemoFollowUpQuestion("몇 시에 먹어요?", [])).toBe("몇 시에 먹어요?")
        expect(resolveDemoFollowUpQuestion("몇 시에 먹어요?", [{ role: "assistant", content: "마그네슘" }])).toBe(
            "몇 시에 먹어요?",
        )
    })
})

describe("supplement-chat golden request", () => {
    const local = readFileSync(resolve(__dirname, "../../docs/ops/golden-examples/supplement-chat.request.golden.json"), "utf8")
    const rootPath = resolve(__dirname, "../../../docs/ops/golden-examples/supplement-chat.request.golden.json")

    // Skipped when the frontend is checked out without the root workspace.
    it.skipIf(!existsSync(rootPath))("frontend-local copy matches the root pack", () => {
        expect(local).toBe(readFileSync(rootPath, "utf8"))
    })

    it("uses the request shape the page sends", () => {
        const golden = JSON.parse(local) as { question: unknown; history: SupplementHistoryTurn[] }
        expect(typeof golden.question).toBe("string")
        expect(golden.history.length).toBeLessThanOrEqual(SUPPLEMENT_HISTORY_MAX_TURNS)
        for (const turn of golden.history) {
            expect(["user", "assistant"]).toContain(turn.role)
            expect(turn.content.length).toBeLessThanOrEqual(SUPPLEMENT_HISTORY_MAX_CONTENT_CHARS)
        }
    })
})

describe("history window", () => {
    it("keeps the first ingredient question through a long chain of follow-ups", () => {
        const messages = [{ id: "u0", role: "user" as const, content: "마그네슘 먹어도 돼?" }, { id: "a0", role: "ai" as const, content: "답변 0" }]
        for (let i = 1; i <= 7; i++) {
            messages.push({ id: `u${i}`, role: "user" as const, content: `후속 질문 ${i}?` })
            messages.push({ id: `a${i}`, role: "ai" as const, content: `답변 ${i}` })
        }
        const history = buildSupplementHistory(messages)
        expect(history.length).toBeLessThanOrEqual(SUPPLEMENT_HISTORY_MAX_TURNS)
        expect(history[0]).toEqual({ role: "user", content: "마그네슘 먹어도 돼?" })
        expect(resolveDemoFollowUpQuestion("그럼 언제 먹어요?", history)).toContain("관련 추가 질문")
    })
})

describe("topic change", () => {
    it("does not reach past a topic change for the context", () => {
        const history = [
            { role: "user" as const, content: "마그네슘 먹어도 돼?" },
            { role: "assistant" as const, content: "..." },
            { role: "user" as const, content: "다른 영양제도 알려줘" },
        ]
        expect(resolveDemoFollowUpQuestion("그럼 언제 먹어요?", history)).toBe("그럼 언제 먹어요?")
    })

    it("treats other excluding phrasings as a topic change", () => {
        for (const shift of ["오메가3 빼고 뭐가 있어?", "마그네슘 대신 다른 거 있어?", "마그네슘 외에 다른 영양제는?"]) {
            const history = [
                { role: "user" as const, content: "마그네슘 먹어도 돼?" },
                { role: "user" as const, content: shift },
            ]
            expect(resolveDemoFollowUpQuestion("그럼 부작용은?", history)).toBe("그럼 부작용은?")
        }
    })

    it("treats excluding the ingredient as a topic change", () => {
        const history = [
            { role: "user" as const, content: "마그네슘 먹어도 돼?" },
            { role: "user" as const, content: "마그네슘 말고 다른 거 있어?" },
        ]
        expect(resolveDemoFollowUpQuestion("그럼 언제 먹어요?", history)).toBe("그럼 언제 먹어요?")
    })
})

describe("isNewTopic", () => {
    const history = [{ role: "user" as const, content: "마그네슘 먹어도 돼?" }]

    it("drops the previous ingredient only for a new supplement search or pure small talk", () => {
        for (const q of ["다른 영양제도 알려줘", "수면에 좋은 영양제 추천해줘", "피로에 좋은 거 추천해줘", "마그네슘 말고 다른 거 없어?", "어떤 영양제가 좋아요?", "고마워요", "감사합니다!"]) {
            expect(isNewTopic(q)).toBe(true)
        }
    })

    it("keeps the ingredient for ordinary follow-ups", () => {
        for (const q of [
            "그 영양제 언제 먹어요?",
            "임신 중인데 괜찮아?",
            "다른 약이랑 같이 먹어도 돼?",
            "같이 뭐 먹으면 안 돼요?",
            "임신 중에도 먹어도 되는 영양제인가요?",
            "언제가 좋아요?",
            "공복에 먹는 게 좋아요?",
            "알겠어요 그럼 부작용은?",
            "커피 대신 물이랑 먹어야 해?",
            "추천 복용량이 얼마예요?",
            "하루 권장량 추천해줘",
            "괜찮은 영양제인가요?",
            "어떤 성분이 들어 있어요?",
        ]) {
            expect(isNewTopic(q)).toBe(false)
            expect(resolveDemoFollowUpQuestion(q, history)).toContain("관련 추가 질문")
        }
    })
})
