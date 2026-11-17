import { describe, expect, it } from "vitest"
import { DEMO_AI_NOTICE, DEMO_FOODS, demoParseDiet, demoQuicklogNotice, demoSupplementAnswer } from "@/utils/demoAi"
import { calcMacroKcal } from "@/utils/dietKcal"
import { draftItemToRequest, firstInvalidDraftItem, isDraftItemSaveable, toDraftItems } from "@/utils/quicklogDraft"

const names = (text: string) => demoParseDiet(text).items.map((i) => i.food_name)

describe("demoParseDiet", () => {
    it("has about 40+ foods with kcal roughly matching macros", () => {
        expect(DEMO_FOODS.length).toBeGreaterThanOrEqual(40)
        for (const f of DEMO_FOODS) {
            expect(f.kcal).toBeGreaterThan(0)
            // alcohol-free table: 4·4·9 should be within 30% (or 15 kcal) of the listed kcal
            const macro = calcMacroKcal(f.proteinG, f.carbsG, f.fatG)
            expect(Math.abs(macro - f.kcal)).toBeLessThanOrEqual(Math.max(15, f.kcal * 0.3))
        }
    })

    it("prefers the longest food name", () => {
        expect(names("김치찌개")).toEqual(["김치찌개"])
        expect(names("컵라면 1개")).toEqual(["컵라면"])
        expect(names("비빔밥, 김밥, 현미밥")).toEqual(["비빔밥", "김밥", "현미밥"])
        expect(names("저녁 닭가슴살 샐러드")).toEqual(["닭가슴살 샐러드"])
        expect(names("김치찌개랑 김치")).toEqual(["김치찌개", "김치"])
    })

    it("parses simple amounts", () => {
        const [rice] = demoParseDiet("밥 한 공기").items
        expect(rice).toMatchObject({ food_name: "쌀밥", amount: 1, unit: "공기", kcal: 315, source: "db" })

        const [half] = demoParseDiet("밥 반 공기").items
        expect(half).toMatchObject({ amount: 0.5, kcal: 158 })

        const [eggs] = demoParseDiet("계란 2개").items
        expect(eggs).toMatchObject({ food_name: "삶은 달걀", amount: 2, unit: "개", kcal: 150, protein_g: 12.6 })

        const [eggsKo] = demoParseDiet("아침 계란 두 개").items
        expect(eggsKo).toMatchObject({ amount: 2, meal_type: "breakfast" })

        const [chicken] = demoParseDiet("닭가슴살 200g").items
        expect(chicken).toMatchObject({ amount: 200, unit: "g", kcal: 220, protein_g: 46 })

        const [plain] = demoParseDiet("바나나").items
        expect(plain).toMatchObject({ amount: 1, unit: "개", kcal: 105 })
    })

    it("splits on 랑/이랑/쉼표 and keeps 사과 whole", () => {
        expect(names("아침 계란 두 개랑 바나나")).toEqual(["삶은 달걀", "바나나"])
        expect(names("사과 1개, 아메리카노 한 잔")).toEqual(["사과", "아메리카노"])
        expect(names("닭가슴살과 고구마")).toEqual(["닭가슴살", "고구마"])
    })

    it("carries the meal word forward", () => {
        const items = demoParseDiet("점심에 제육볶음 한 그릇이랑 밥").items
        expect(items.map((i) => i.meal_type)).toEqual(["lunch", "lunch"])
    })

    it("returns unknown foods as rough estimates without a db source", () => {
        const result = demoParseDiet("점심 마라탕 한 그릇")
        expect(result.items).toHaveLength(1)
        expect(result.items[0]).toMatchObject({ food_name: "마라탕", source: null, kcal: null, protein_g: 10 })
        expect(result.estimatedFoods).toEqual(["마라탕"])
        expect(demoQuicklogNotice(result)).toContain("마라탕")
        expect(demoQuicklogNotice(result)).toContain("데모 모드 예시 결과")
    })

    it("ignores chatter", () => {
        expect(demoParseDiet("안녕").items).toEqual([])
        expect(demoParseDiet("   ").items).toEqual([])
    })

    it("produces rows the real save pipeline accepts", () => {
        const text = "아침 밥 한 공기, 김치찌개, 계란 2개랑 바나나 그리고 마라탕, 아메리카노 한 잔, 닭가슴살 200g"
        const drafts = toDraftItems(demoParseDiet(text).items, "lunch")
        expect(drafts).toHaveLength(7)
        expect(drafts.every(isDraftItemSaveable)).toBe(true)
        expect(firstInvalidDraftItem(drafts)).toBeNull()
        expect(drafts.find((d) => d.foodName === "마라탕")?.source).toBe("ai")
        for (const d of drafts) {
            const req = draftItemToRequest(d, "2026-11-17")
            if (d.source === "db") expect(req.kcal).toBeGreaterThan(0)
        }
    })
})

describe("demoSupplementAnswer", () => {
    it.each([
        ["마그네슘 언제 먹어?", "마그네슘"],
        ["비타민D 같이 먹어도 돼?", "비타민 D"],
        ["타이레놀이랑 오메가3 같이 먹어도 돼?", "오메가3"],
        ["크레아틴 운동 전에 먹어야 해?", "크레아틴"],
        ["철분제 커피랑 먹어도 돼?", "철분"],
    ])("answers %s", (question, topic) => {
        const res = demoSupplementAnswer(question)
        expect(res.answer.startsWith(`[${DEMO_AI_NOTICE}]`)).toBe(true)
        expect(res.answer).toContain(topic)
        expect(res.mode).toBe("full")
        expect(res.caution).toMatch(/의사·약사/)
    })

    it("flags medication questions in caution", () => {
        expect(demoSupplementAnswer("타이레놀이랑 오메가3 같이 먹어도 돼?").caution).toContain("먹고 있는 약")
    })

    it("falls back to a generic doctor/pharmacist answer", () => {
        const res = demoSupplementAnswer("홍삼 부작용이 뭐야?")
        expect(res.answer).toContain(DEMO_AI_NOTICE)
        expect(res.answer).toMatch(/의사나 약사/)
        expect(res.caution).toBeTruthy()
    })
})
