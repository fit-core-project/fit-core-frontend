import type { DietDailyAggregationResponse } from "@/types/project"

/**
 * A day hits the kcal goal when intake lands within 90%~110% of kcalGoal.
 * NutritionTarget only carries kcalGoal (no kcal min/max), so the range is derived from it.
 */
export const KCAL_TARGET_LOWER_RATIO = 0.9
export const KCAL_TARGET_UPPER_RATIO = 1.1

export function kcalTargetRange(kcalGoal: number | null | undefined): { min: number; max: number } | null {
    if (kcalGoal == null || !(kcalGoal > 0)) return null
    return { min: Math.round(kcalGoal * KCAL_TARGET_LOWER_RATIO), max: Math.round(kcalGoal * KCAL_TARGET_UPPER_RATIO) }
}

export type KcalDayStatus = "none" | "recorded" | "under" | "on_target" | "over"

export function kcalDayStatus(kcal: number | null | undefined, kcalGoal: number | null | undefined): KcalDayStatus {
    if (kcal == null) return "none"
    const range = kcalTargetRange(kcalGoal)
    if (!range) return "recorded"
    if (kcal < range.min) return "under"
    if (kcal > range.max) return "over"
    return "on_target"
}

export function isKcalOnTarget(kcal: number, kcalGoal: number | null | undefined): boolean {
    return kcalDayStatus(kcal, kcalGoal) === "on_target"
}

/** Percent of recorded days (count > 0) within the target range; null without a goal or records. */
export function kcalAchievementRate(rows: DietDailyAggregationResponse[], kcalGoal: number | null | undefined): number | null {
    if (!kcalTargetRange(kcalGoal)) return null
    const recorded = rows.filter((r) => r.count > 0)
    if (recorded.length === 0) return null
    const achieved = recorded.filter((r) => isKcalOnTarget(r.totalKcal, kcalGoal)).length
    return Math.round((achieved / recorded.length) * 100)
}

function parseYmdUtc(value: string): Date {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(Date.UTC(year, month - 1, day))
}

function formatYmdUtc(date: Date): string {
    return date.toISOString().slice(0, 10)
}

/** Monday~Sunday week containing `today` (YYYY-MM-DD). */
export function getWeekRange(today: string): { start: string; end: string } {
    const date = parseYmdUtc(today)
    const day = date.getUTCDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const start = new Date(date)
    start.setUTCDate(date.getUTCDate() + mondayOffset)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    return { start: formatYmdUtc(start), end: formatYmdUtc(end) }
}

/** Days of the Monday-start week elapsed including today: Monday = 1 … Sunday = 7. */
export function daysElapsedInWeek(today: string): number {
    const day = parseYmdUtc(today).getUTCDay()
    return day === 0 ? 7 : day
}

/** kcalGoal × days elapsed this week, or null without a goal. */
export function weeklyKcalGoalToDate(kcalGoal: number | null | undefined, today: string): number | null {
    if (kcalGoal == null || !(kcalGoal > 0)) return null
    return kcalGoal * daysElapsedInWeek(today)
}

/** "오늘 영양 합계" for today, "11월 14일 영양 합계" for another date. */
export function dailyTotalsLabel(logDate: string, today: string): string {
    if (logDate === today) return "오늘 영양 합계"
    const [, month, day] = logDate.split("-").map(Number)
    return month && day ? `${month}월 ${day}일 영양 합계` : "그날 영양 합계"
}
