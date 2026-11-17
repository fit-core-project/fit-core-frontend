import type { DietDailyAggregationResponse } from "@/types/project"
import { kcalAchievementRate } from "@/utils/nutritionGoal"

export interface NutritionTrendSummary {
    /** Days in range with at least one log. */
    recordedRows: DietDailyAggregationResponse[]
    avgKcal: number | null
    avgProteinG: number
    avgCarbsG: number
    avgFatG: number
    achievementRate: number | null
}

/** Rows whose date falls inside [from, to] (YYYY-MM-DD, inclusive). */
export function rowsInRange(rows: DietDailyAggregationResponse[], from: string, to: string): DietDailyAggregationResponse[] {
    return rows.filter((r) => r.date >= from && r.date <= to)
}

function avg(values: number[]): number | null {
    if (values.length === 0) return null
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

function avgMacro(values: number[]): number {
    if (values.length === 0) return 0
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

/** Averages and goal achievement for the selected period only, so a 30-day response never leaks into the 7-day view. */
export function summarizeNutritionTrend(
    rows: DietDailyAggregationResponse[],
    from: string,
    to: string,
    kcalGoal: number | null | undefined,
): NutritionTrendSummary {
    const recordedRows = rowsInRange(rows, from, to).filter((r) => r.count > 0)
    return {
        recordedRows,
        avgKcal: avg(recordedRows.map((r) => r.totalKcal)),
        avgProteinG: avgMacro(recordedRows.map((r) => Number(r.totalProteinG))),
        avgCarbsG: avgMacro(recordedRows.map((r) => Number(r.totalCarbsG))),
        avgFatG: avgMacro(recordedRows.map((r) => Number(r.totalFatG))),
        achievementRate: kcalAchievementRate(recordedRows, kcalGoal),
    }
}
