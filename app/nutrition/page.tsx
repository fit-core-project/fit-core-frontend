"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays, Target, Utensils } from "lucide-react"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import NutritionCalendarSection from "@/app/my/stats/NutritionCalendarSection"
import type { DietDailyAggregationResponse, DietSummaryResponse, NutritionTarget } from "@/types/project"

function getKstToday(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function parseYmd(value: string): Date {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(year, month - 1, day)
}

function formatYmd(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getWeekRange(today: string): { start: string; end: string } {
    const date = parseYmd(today)
    const day = date.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const start = new Date(date)
    start.setDate(date.getDate() + mondayOffset)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { start: formatYmd(start), end: formatYmd(end) }
}

function formatKcal(value: number): string {
    return `${Math.round(value).toLocaleString()} kcal`
}

function ProgressBar({ percent, color = "bg-emerald-400" }: { percent: number; color?: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
            <span className="w-10 text-right text-xs font-black text-slate-600">{Math.round(percent)}%</span>
        </div>
    )
}

export default function NutritionPage() {
    const today = getKstToday()
    const weekRange = useMemo(() => getWeekRange(today), [today])

    const [summary, setSummary] = useState<DietSummaryResponse | null>(null)
    const [target, setTarget] = useState<NutritionTarget | null>(null)
    const [weeklyRows, setWeeklyRows] = useState<DietDailyAggregationResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        Promise.all([
            dietApiClient.getToday(),
            nutritionTargetApiClient.getTarget(),
            dietApiClient.getDailySummary(weekRange.start, weekRange.end),
        ])
            .then(([todaySummary, nutritionTarget, rows]) => {
                setSummary(todaySummary)
                setTarget(nutritionTarget)
                setWeeklyRows(rows ?? [])
            })
            .catch(() => {
                setSummary(null)
                setTarget(null)
                setWeeklyRows([])
                setError(true)
            })
            .finally(() => setLoading(false))
    }, [weekRange.start, weekRange.end])

    const totalKcal = summary?.totalKcal ?? 0
    const kcalGoal = target?.kcalGoal ?? null
    const hasKcalGoal = kcalGoal != null && kcalGoal > 0
    const remainingKcal = hasKcalGoal ? kcalGoal - totalKcal : null
    const dailyPercent = hasKcalGoal ? Math.min((totalKcal / kcalGoal) * 100, 100) : 0

    const weeklyTotal = weeklyRows.reduce((total, row) => total + row.totalKcal, 0)
    const weeklyGoal = hasKcalGoal ? kcalGoal * 7 : null
    const weeklyPercent = weeklyGoal ? Math.min((weeklyTotal / weeklyGoal) * 100, 100) : null
    const hasTodayItems = (summary?.items.length ?? 0) > 0

    return (
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 p-4 pb-10">
            <header className="px-1">
                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-500">Nutrition</p>
                    <h1 className="text-2xl font-extrabold text-slate-900">영양</h1>
                </div>
            </header>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-base font-extrabold text-slate-800">오늘 영양</h2>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
                        <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
                        <div className="grid grid-cols-3 gap-3">
                            {[0, 1, 2].map((item) => (
                                <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    <div>
                        <p className="text-sm font-bold text-slate-800">영양 데이터를 불러오지 못했습니다.</p>
                        <p className="mt-1 text-sm text-slate-500">잠시 후 다시 확인해 주세요.</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex flex-wrap items-baseline gap-x-1">
                            <span className="text-3xl font-extrabold text-slate-900">{totalKcal.toLocaleString()}</span>
                            <span className="text-sm font-bold text-slate-400">kcal</span>
                            {hasKcalGoal && (
                                <span className="ml-1 text-xs font-semibold text-slate-400">
                                    / {kcalGoal.toLocaleString()} kcal
                                </span>
                            )}
                        </div>

                        {hasKcalGoal ? (
                            <>
                                <div className="mb-2 mt-3">
                                    <ProgressBar
                                        percent={dailyPercent}
                                        color={totalKcal > kcalGoal ? "bg-red-400" : "bg-emerald-400"}
                                    />
                                </div>
                                <p className={`text-sm font-bold ${remainingKcal! >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                    {remainingKcal! >= 0
                                        ? `남은 칼로리 ${formatKcal(remainingKcal!)}`
                                        : `초과 칼로리 ${formatKcal(Math.abs(remainingKcal!))}`}
                                </p>
                            </>
                        ) : (
                            <div className="mt-3 rounded-2xl bg-amber-50 p-3">
                                <p className="text-sm font-bold text-amber-800">
                                    목표 칼로리가 아직 설정되지 않았습니다.
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                                    프로필을 완성하면 섭취량을 목표와 비교할 수 있습니다.
                                </p>
                            </div>
                        )}

                        <div className="mt-5 grid grid-cols-3 gap-3">
                            <div className="rounded-2xl bg-slate-50 p-3 text-center">
                                <p className="text-[11px] font-bold text-slate-400">단백질</p>
                                <p className="mt-1 text-sm font-black text-slate-800">{summary?.totalProteinG ?? 0}g</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3 text-center">
                                <p className="text-[11px] font-bold text-slate-400">탄수화물</p>
                                <p className="mt-1 text-sm font-black text-slate-800">{summary?.totalCarbsG ?? 0}g</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3 text-center">
                                <p className="text-[11px] font-bold text-slate-400">지방</p>
                                <p className="mt-1 text-sm font-black text-slate-800">{summary?.totalFatG ?? 0}g</p>
                            </div>
                        </div>

                        {!hasTodayItems && (
                            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                <p className="text-sm font-bold text-slate-700">오늘 기록된 식단이 없습니다.</p>
                                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                    식단을 기록하면 섭취 칼로리를 확인할 수 있습니다.
                                </p>
                            </div>
                        )}

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <Link
                                href="/my?tab=nutrition"
                                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
                            >
                                직접 입력
                            </Link>
                            <Link
                                href="/ai_quicklog"
                                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                            >
                                AI로 기록
                            </Link>
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-rose-500" />
                    <h2 className="text-base font-extrabold text-slate-800">주간 칼로리 목표</h2>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        <div className="h-4 w-52 animate-pulse rounded bg-slate-200" />
                        <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
                    </div>
                ) : weeklyGoal ? (
                    <div>
                        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-600">
                                이번 주 {formatKcal(weeklyGoal)} 목표 중 {formatKcal(weeklyTotal)} 섭취
                            </p>
                            <span className="text-xs font-semibold text-slate-400">
                                {weekRange.start} - {weekRange.end}
                            </span>
                        </div>
                        <ProgressBar percent={weeklyPercent ?? 0} color={weeklyTotal > weeklyGoal ? "bg-red-400" : "bg-emerald-400"} />
                    </div>
                ) : (
                    <div>
                        <p className="text-sm font-bold text-slate-800">목표 칼로리가 아직 설정되지 않았습니다.</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500">
                            프로필을 완성하면 주간 섭취량을 목표와 비교할 수 있습니다.
                        </p>
                        <Link
                            href="/my?tab=profile"
                            className="mt-4 inline-flex min-h-11 items-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            프로필 완성하기
                        </Link>
                    </div>
                )}
            </section>

            <section>
                <div className="mb-3 flex items-center gap-2 px-1">
                    <CalendarDays className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-base font-extrabold text-slate-800">식단 캘린더</h2>
                </div>
                <NutritionCalendarSection />
            </section>
        </div>
    )
}
