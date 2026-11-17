import type { DietDailyAggregationResponse, DietLogResponse } from "@/types/project"

const round1 = (value: number) => Math.round(value * 10) / 10

/** Same shape as BE /api/diet-logs/daily-summary: one row per date that has logs, ascending by date. */
export function aggregateDietLogs(logs: DietLogResponse[], from: string, to: string): DietDailyAggregationResponse[] {
    const byDate = new Map<string, DietDailyAggregationResponse>()
    for (const log of logs) {
        const date = typeof log.logDate === "string" ? log.logDate.slice(0, 10) : ""
        if (!date || date < from || date > to) continue
        const row = byDate.get(date) ?? { date, totalKcal: 0, totalCarbsG: 0, totalProteinG: 0, totalFatG: 0, count: 0 }
        row.totalKcal += Number(log.kcal ?? 0)
        row.totalCarbsG += Number(log.carbsG ?? 0)
        row.totalProteinG += Number(log.proteinG ?? 0)
        row.totalFatG += Number(log.fatG ?? 0)
        row.count += 1
        byDate.set(date, row)
    }
    return [...byDate.values()]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((row) => ({
            ...row,
            totalKcal: Math.round(row.totalKcal),
            totalCarbsG: round1(row.totalCarbsG),
            totalProteinG: round1(row.totalProteinG),
            totalFatG: round1(row.totalFatG),
        }))
}
