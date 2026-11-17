import { describe, it, expect } from "vitest"
import { calcMacroKcal, resolveDietKcal } from "../../utils/dietKcal"
import {
    dailyTotalsLabel,
    daysElapsedInWeek,
    getWeekRange,
    isKcalOnTarget,
    kcalAchievementRate,
    kcalDayStatus,
    weeklyKcalGoalToDate,
} from "../../utils/nutritionGoal"
import { aggregateDietLogs } from "../../utils/dietAggregation"
import { aiErrorMessage, classifyAiError, micErrorMessage } from "../../utils/aiRequestError"
import { parseStoredChat } from "../../utils/supplementChatStorage"
import type { DietDailyAggregationResponse, DietLogResponse } from "../../types/project"

describe("resolveDietKcal mirrors BE DietLogService.resolveKcal", () => {
    it("ai rows always use 4·4·9 and ignore a sent kcal", () => {
        expect(resolveDietKcal({ source: "ai", kcal: 999, proteinG: 10, carbsG: 20, fatG: 5 })).toBe(165)
        expect(resolveDietKcal({ source: "ai", kcal: 999 })).toBeNull()
    })
    it("db rows use kcal only when > 0", () => {
        expect(resolveDietKcal({ source: "db", kcal: 300, proteinG: 1 })).toBe(300)
        expect(resolveDietKcal({ source: "db", kcal: 0, proteinG: 10 })).toBe(40)
    })
    it("manual rows prefer typed kcal, then macros", () => {
        expect(resolveDietKcal({ source: "manual", kcal: 0 })).toBe(0)
        expect(resolveDietKcal({ source: "manual", kcal: null, fatG: 10 })).toBe(90)
        expect(resolveDietKcal({ source: "manual" })).toBeNull()
    })
    it("calcMacroKcal rounds", () => {
        expect(calcMacroKcal(6.5, 68, 1.5)).toBe(312)
    })
})

describe("kcal goal achievement (90%~110%)", () => {
    it("classifies days against the range", () => {
        expect(kcalDayStatus(undefined, 2000)).toBe("none")
        expect(kcalDayStatus(1500, null)).toBe("recorded")
        expect(kcalDayStatus(300, 2000)).toBe("under")
        expect(kcalDayStatus(1800, 2000)).toBe("on_target")
        expect(kcalDayStatus(2200, 2000)).toBe("on_target")
        expect(kcalDayStatus(2201, 2000)).toBe("over")
    })
    it("300 kcal is not an achieved day", () => {
        expect(isKcalOnTarget(300, 2000)).toBe(false)
    })
    it("rate counts only recorded days inside the range", () => {
        const row = (date: string, totalKcal: number, count = 1): DietDailyAggregationResponse => ({
            date,
            totalKcal,
            totalCarbsG: 0,
            totalProteinG: 0,
            totalFatG: 0,
            count,
        })
        const rows = [row("2026-11-10", 300), row("2026-11-11", 1950), row("2026-11-12", 2500), row("2026-11-13", 2100), row("2026-11-14", 0, 0)]
        expect(kcalAchievementRate(rows, 2000)).toBe(50)
        expect(kcalAchievementRate(rows, null)).toBeNull()
        expect(kcalAchievementRate([], 2000)).toBeNull()
    })
})

describe("week helpers", () => {
    it("Monday-start week range", () => {
        expect(getWeekRange("2026-11-16")).toEqual({ start: "2026-11-16", end: "2026-11-22" }) // Monday
        expect(getWeekRange("2026-11-22")).toEqual({ start: "2026-11-16", end: "2026-11-22" }) // Sunday
        expect(getWeekRange("2026-12-31")).toEqual({ start: "2026-12-28", end: "2027-01-03" })
    })
    it("days elapsed: Monday 1 … Sunday 7", () => {
        expect(daysElapsedInWeek("2026-11-16")).toBe(1)
        expect(daysElapsedInWeek("2026-11-19")).toBe(4)
        expect(daysElapsedInWeek("2026-11-22")).toBe(7)
    })
    it("weekly goal is prorated by elapsed days", () => {
        expect(weeklyKcalGoalToDate(2000, "2026-11-18")).toBe(6000)
        expect(weeklyKcalGoalToDate(null, "2026-11-18")).toBeNull()
        expect(weeklyKcalGoalToDate(0, "2026-11-18")).toBeNull()
    })
    it("daily totals label", () => {
        expect(dailyTotalsLabel("2026-11-16", "2026-11-16")).toBe("오늘 영양 합계")
        expect(dailyTotalsLabel("2026-11-04", "2026-11-16")).toBe("11월 4일 영양 합계")
    })
})

describe("aggregateDietLogs (demo daily-summary)", () => {
    const log = (id: string, logDate: string, kcal: number, p: number | null, c: number | null, f: number | null): DietLogResponse => ({
        id,
        logDate,
        foodName: id,
        kcal,
        proteinG: p,
        carbsG: c,
        fatG: f,
        source: "manual",
    })
    it("groups by date within range, sorted, rounded", () => {
        const rows = aggregateDietLogs(
            [
                log("a", "2026-11-16", 315, 6.5, 68, 1.5),
                log("b", "2026-11-16", 155, 13, 1.1, 11),
                log("c", "2026-11-15", 290, 5, 62, null),
                log("d", "2026-10-01", 100, 1, 1, 1),
            ],
            "2026-11-10",
            "2026-11-16",
        )
        expect(rows).toEqual([
            { date: "2026-11-15", totalKcal: 290, totalCarbsG: 62, totalProteinG: 5, totalFatG: 0, count: 1 },
            { date: "2026-11-16", totalKcal: 470, totalCarbsG: 69.1, totalProteinG: 19.5, totalFatG: 12.5, count: 2 },
        ])
    })
})

describe("AI error mapping", () => {
    it("classifies axios-like errors", () => {
        expect(classifyAiError({ code: "ERR_CANCELED", name: "CanceledError" })).toBe("canceled")
        expect(classifyAiError({ code: "ECONNABORTED", message: "timeout of 90000ms exceeded" })).toBe("timeout")
        expect(classifyAiError({ code: "ERR_NETWORK", message: "Network Error" })).toBe("network")
        expect(classifyAiError({ response: { status: 503 } })).toBe("busy")
        expect(classifyAiError({ response: { status: 429 } })).toBe("rate_limited")
        expect(classifyAiError({ response: { status: 422 } })).toBe("invalid")
        expect(classifyAiError({ response: { status: 404 } })).toBe("generic")
        expect(classifyAiError({ message: "x", request: {} })).toBe("network")
        expect(classifyAiError(new TypeError("boom"))).toBe("generic")
    })
    it("never leaks raw messages and returns null on cancel", () => {
        const msg = aiErrorMessage({ code: "ERR_NETWORK", message: "Network Error" }, "parse")
        expect(msg).not.toContain("Network Error")
        expect(aiErrorMessage({ code: "ECONNABORTED", message: "timeout of 90000ms exceeded" }, "chat")).not.toMatch(/timeout|ms/)
        expect(aiErrorMessage({ code: "ERR_CANCELED" }, "chat")).toBeNull()
        expect(aiErrorMessage({ response: { status: 500, data: { detail: "Traceback" } } }, "stt")).not.toContain("Traceback")
    })
    it("mic errors are about the microphone", () => {
        expect(micErrorMessage({ name: "NotAllowedError" })).toContain("마이크 권한")
        expect(micErrorMessage({ name: "NotFoundError" })).toContain("마이크를 찾지")
        expect(micErrorMessage(new Error("x"))).toContain("녹음")
    })
})

describe("parseStoredChat", () => {
    it("restores valid messages and drops junk", () => {
        const raw = JSON.stringify([{ id: "1", role: "user", content: "hi" }, { id: 2 }, null, { id: "3", role: "ai", content: "ok", mode: "degraded" }])
        expect(parseStoredChat(raw)?.map((m) => m.id)).toEqual(["1", "3"])
    })
    it("returns null for empty or broken storage", () => {
        expect(parseStoredChat(null)).toBeNull()
        expect(parseStoredChat("{")).toBeNull()
        expect(parseStoredChat("[]")).toBeNull()
        expect(parseStoredChat('{"a":1}')).toBeNull()
    })
})
