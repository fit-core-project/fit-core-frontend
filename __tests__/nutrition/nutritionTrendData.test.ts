import { describe, expect, it } from "vitest"
import type { DietDailyAggregationResponse } from "@/types/project"
import { rowsInRange, summarizeNutritionTrend } from "@/app/my/stats/nutritionTrendData"

const day = (date: string, totalKcal: number, count = 1): DietDailyAggregationResponse =>
    ({ date, totalKcal, totalProteinG: 100, totalCarbsG: 200, totalFatG: 50, count }) as unknown as DietDailyAggregationResponse

describe("summarizeNutritionTrend (P2-9)", () => {
    // A 30-day response still in state while the 7-day view is shown.
    const rows = [day("2026-10-20", 4000), day("2026-11-01", 4000), day("2026-11-12", 2000), day("2026-11-17", 1000), day("2026-11-15", 0, 0)]

    it("keeps only rows inside from..to", () => {
        expect(rowsInRange(rows, "2026-11-11", "2026-11-17").map((r) => r.date)).toEqual(["2026-11-12", "2026-11-17", "2026-11-15"])
    })
    it("averages and achievement ignore out-of-range and empty days", () => {
        const s = summarizeNutritionTrend(rows, "2026-11-11", "2026-11-17", 2000)
        expect(s.recordedRows).toHaveLength(2)
        expect(s.avgKcal).toBe(1500)
        expect(s.avgProteinG).toBe(100)
        expect(s.achievementRate).toBe(50)
    })
    it("empty range", () => {
        const s = summarizeNutritionTrend(rows, "2026-12-01", "2026-12-07", 2000)
        expect(s.avgKcal).toBeNull()
        expect(s.achievementRate).toBeNull()
    })
})
