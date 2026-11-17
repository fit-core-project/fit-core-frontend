import { describe, it, expect } from "vitest"
import {
    applyDraftEdit,
    defaultMealTypeByKstHour,
    draftItemKcal,
    draftItemToRequest,
    draftItemErrors,
    draftTotals,
    firstInvalidDraftItem,
    isDraftItemSaveable,
    parseOptionalNumber,
    quicklogSaveLabel,
    rejectedDietItemIndex,
    sharedMealType,
    toDraftItems,
    type ParseDietItem,
    type QuicklogDraftItem,
} from "../../utils/quicklogDraft"
import { kcalToSend, resolveDietKcal } from "../../utils/dietKcal"

const kstAt = (hour: number) => new Date(Date.UTC(2026, 10, 16, hour - 9 < 0 ? hour + 15 : hour - 9))

describe("defaultMealTypeByKstHour", () => {
    it("maps KST hours to meals", () => {
        expect(defaultMealTypeByKstHour(kstAt(7))).toBe("breakfast")
        expect(defaultMealTypeByKstHour(kstAt(12))).toBe("lunch")
        expect(defaultMealTypeByKstHour(kstAt(16))).toBe("snack")
        expect(defaultMealTypeByKstHour(kstAt(19))).toBe("dinner")
        expect(defaultMealTypeByKstHour(kstAt(23))).toBe("snack")
        expect(defaultMealTypeByKstHour(kstAt(2))).toBe("snack")
    })
})

const parsed: ParseDietItem[] = [
    { food_name: "잡곡밥", amount: 210, unit: "g", protein_g: 6.5, carbs_g: 68, fat_g: 1.5, kcal: 315, source: "db", meal_type: "breakfast", time_of_day: "07:30" },
    { food_name: "제육볶음", amount: 1, unit: "그릇", protein_g: 25, carbs_g: 15, fat_g: 20, kcal: 999, source: "ai", meal_type: null, time_of_day: "아침" },
    { food_name: "알 수 없는 음식", source: "ai" },
]

describe("toDraftItems", () => {
    it("keeps AI meal, falls back to the time-based meal, drops ai kcal and bad times", () => {
        const items = toDraftItems(parsed, "lunch")
        expect(items.map((i) => i.mealType)).toEqual(["breakfast", "lunch", "lunch"])
        expect(items[0].kcal).toBe(315)
        expect(items[1].kcal).toBeNull()
        expect(items[0].loggedAt).toBe("07:30")
        expect(items[1].loggedAt).toBeNull()
        expect(new Set(items.map((i) => i.key)).size).toBe(3)
    })
})

describe("kcal preview and saveability", () => {
    const items = toDraftItems(parsed, "lunch")
    it("per-item kcal follows BE rules", () => {
        expect(draftItemKcal(items[0])).toBe(315)
        expect(draftItemKcal(items[1])).toBe(25 * 4 + 15 * 4 + 20 * 9)
        expect(draftItemKcal(items[2])).toBeNull()
        expect(items.map(isDraftItemSaveable)).toEqual([true, true, false])
    })
    it("totals include only saveable items", () => {
        expect(draftTotals(items)).toEqual({ kcal: 315 + 340, proteinG: 31.5, carbsG: 83, fatG: 21.5 })
    })
})

describe("applyDraftEdit", () => {
    const [db, ai, empty] = toDraftItems(parsed, "lunch")
    it("typed kcal wins and turns the row manual", () => {
        const next = applyDraftEdit(ai, { proteinG: 30 }, 500)
        expect(next.source).toBe("manual")
        expect(draftItemKcal(next)).toBe(500)
    })
    it("changing macros without typed kcal recomputes kcal", () => {
        const next = applyDraftEdit(db, { proteinG: 10, carbsG: 50, fatG: 2 })
        expect(next.kcal).toBeNull()
        expect(draftItemKcal(next)).toBe(10 * 4 + 50 * 4 + 2 * 9)
    })
    it("renaming a db row keeps its DB kcal", () => {
        const next = applyDraftEdit(db, { foodName: "현미밥" })
        expect(draftItemKcal(next)).toBe(315)
    })
    it("a row without nutrition becomes saveable once kcal is typed", () => {
        const next = applyDraftEdit(empty, {}, 250)
        expect(isDraftItemSaveable(next)).toBe(true)
        expect(draftItemToRequest(next, "2026-11-14")).toMatchObject({ kcal: 250, source: "manual", logDate: "2026-11-14" })
    })
})

describe("draftItemToRequest", () => {
    const [db, ai] = toDraftItems(parsed, "lunch")
    it("maps grams, raw amount, date and meal", () => {
        expect(draftItemToRequest(db, "2026-11-15")).toEqual({
            logDate: "2026-11-15",
            mealType: "breakfast",
            loggedAt: "07:30",
            foodName: "잡곡밥",
            amountG: 210,
            amountRaw: "210g",
            proteinG: 6.5,
            carbsG: 68,
            fatG: 1.5,
            kcal: 315,
            source: "db",
        })
        expect(draftItemToRequest(ai, "2026-11-16")).toMatchObject({ amountG: null, amountRaw: "1그릇", kcal: null, source: "ai", mealType: "lunch" })
    })
})

describe("small helpers", () => {
    it("sharedMealType", () => {
        const items = toDraftItems(parsed, "lunch")
        expect(sharedMealType(items)).toBeNull()
        expect(sharedMealType(items.slice(1))).toBe("lunch")
        expect(sharedMealType([])).toBeNull()
    })
    it("parseOptionalNumber", () => {
        expect(parseOptionalNumber("")).toBeNull()
        expect(parseOptionalNumber(" 12.5 ")).toBe(12.5)
        expect(parseOptionalNumber("-1")).toBeUndefined()
        expect(parseOptionalNumber("abc")).toBeUndefined()
    })
})

const row = (patch: Partial<QuicklogDraftItem>): QuicklogDraftItem => ({
    key: "k",
    foodName: "음식",
    amount: null,
    unit: null,
    proteinG: 20,
    carbsG: 30,
    fatG: null,
    kcal: null,
    source: "db",
    mealType: "lunch",
    loggedAt: null,
    ...patch,
})

describe("preview kcal == saved kcal (P1-4, P2-6)", () => {
    // resolveDietKcal mirrors BE DietLogService.resolveKcal, so applying it to the request is what BE stores.
    const cases: Array<[string, Partial<QuicklogDraftItem>]> = [
        ["db kcal 0 -> macros", { source: "db", kcal: 0 }],
        ["db kcal null -> macros", { source: "db", kcal: null }],
        ["db kcal negative -> macros", { source: "db", kcal: -5 }],
        ["db kcal 0.4 rounds to 0 -> macros", { source: "db", kcal: 0.4 }],
        ["db kcal decimal", { source: "db", kcal: 315.6 }],
        ["db kcal .5 rounds up", { source: "db", kcal: 200.5 }],
        ["db kcal > 0", { source: "db", kcal: 315 }],
        ["ai ignores kcal", { source: "ai", kcal: 999 }],
        ["manual kcal 0 is kept", { source: "manual", kcal: 0 }],
        ["manual kcal null -> macros", { source: "manual", kcal: null }],
        ["manual decimal", { source: "manual", kcal: 99.5 }],
        ["macros with decimals", { source: "manual", kcal: null, proteinG: 10.3, carbsG: 0.2, fatG: 1.1 }],
    ]
    it.each(cases)("%s", (_, patch) => {
        const item = row(patch)
        const req = draftItemToRequest(item, "2026-11-17")
        expect(resolveDietKcal(req)).toBe(draftItemKcal(item))
        if (req.kcal != null) expect(Number.isInteger(req.kcal)).toBe(true)
        // Renaming only (no macro change) must keep the kcal the preview showed, and save it too.
        const renamed = applyDraftEdit(item, { foodName: "x" })
        expect(draftItemKcal(renamed)).toBe(draftItemKcal(item))
        expect(resolveDietKcal(draftItemToRequest(renamed, "2026-11-17"))).toBe(draftItemKcal(item))
    })
    it("db kcal 0 goes out as null so BE computes from macros", () => {
        const item = row({ source: "db", kcal: 0 })
        expect(draftItemToRequest(item, "2026-11-17").kcal).toBeNull()
        expect(draftItemKcal(item)).toBe(20 * 4 + 30 * 4)
    })
    it("kcal is rounded before sending", () => {
        expect(draftItemToRequest(row({ source: "db", kcal: 315.6 }), "2026-11-17").kcal).toBe(316)
        expect(kcalToSend("manual", 99.4)).toBe(99)
        expect(kcalToSend("db", 0)).toBeNull()
        expect(kcalToSend("ai", 300)).toBeNull()
    })
})

describe("backend bounds (P2-4)", () => {
    it("flags kcal > 5000, macros > 1000 and gram amount > 5000", () => {
        const errors = draftItemErrors(row({ source: "manual", kcal: 5001, proteinG: 1000.1, carbsG: 1000, fatG: 2000, amount: 5001, unit: "g" }))
        expect(Object.keys(errors).sort()).toEqual(["amount", "fatG", "kcal", "proteinG"])
    })
    it("allows values at the limit", () => {
        expect(draftItemErrors(row({ source: "manual", kcal: 5000, proteinG: 1000, carbsG: 1000, fatG: 1000, amount: 5000, unit: "g" }))).toEqual({})
    })
    it("checks the sent kcal only (rounded; ai kcal ignored; macro-derived kcal not limited)", () => {
        expect(draftItemErrors(row({ source: "manual", kcal: 5000.4 }))).toEqual({})
        expect(draftItemErrors(row({ source: "ai", kcal: 9000 }))).toEqual({})
        expect(draftItemErrors(row({ source: "manual", kcal: null, proteinG: 900, carbsG: 900, fatG: 900 }))).toEqual({})
    })
    it("amount is limited only when sent as grams", () => {
        expect(draftItemErrors(row({ amount: 6000, unit: "개" }))).toEqual({})
        expect(draftItemErrors(row({ amount: 6000, unit: " G " })).amount).toBeDefined()
    })
    it("firstInvalidDraftItem points at the saveable offender", () => {
        const ok = row({ key: "ok" })
        const bad = row({ key: "bad", source: "manual", kcal: 9999 })
        const noNutrition = row({ key: "none", proteinG: null, carbsG: null, kcal: null, amount: 9999, unit: "g" })
        expect(firstInvalidDraftItem([ok, noNutrition, bad])?.key).toBe("bad")
        expect(firstInvalidDraftItem([ok, noNutrition])).toBeNull()
    })
    it("rejectedDietItemIndex reads the row index from a 400 body", () => {
        const err = (message: unknown, status = 400) => ({ response: { status, data: { message } } })
        expect(rejectedDietItemIndex(err("saveBatch.requests[2].kcal: 5000 이하"), 3)).toBe(2)
        expect(rejectedDietItemIndex(err("[1].kcal: must be less than or equal to 5000"), 3)).toBe(1)
        expect(rejectedDietItemIndex(err("requests[5].kcal"), 3)).toBeNull()
        expect(rejectedDietItemIndex(err("잘못된 입력"), 3)).toBeNull()
        expect(rejectedDietItemIndex(err("[0].kcal", 500), 3)).toBeNull()
        expect(rejectedDietItemIndex(new Error("x"), 3)).toBeNull()
    })
})

describe("quicklogSaveLabel (P2-5)", () => {
    const today = "2026-11-17"
    it("empty date disables saving without a 0월 0일 label", () => {
        expect(quicklogSaveLabel("", today)).toEqual({ label: "날짜를 골라 주세요", disabled: true })
    })
    it("future date is disabled", () => {
        expect(quicklogSaveLabel("2026-11-18", today).disabled).toBe(true)
    })
    it("today and past dates", () => {
        expect(quicklogSaveLabel(today, today)).toEqual({ label: "식단 저장", disabled: false })
        expect(quicklogSaveLabel("2026-11-05", today)).toEqual({ label: "11월 5일 식단으로 저장", disabled: false })
    })
})
