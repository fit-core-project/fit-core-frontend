"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Sparkles } from "lucide-react"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import NutritionCalendarSection from "@/app/my/stats/NutritionCalendarSection"
import NutritionTab from "@/app/my/nutrition/NutritionTab"
import ManualEntryModal from "@/app/my/nutrition/ManualEntryModal"
import type { DietDailyAggregationResponse, DietSummaryResponse, NutritionTarget } from "@/types/project"
import { Button, ButtonLink, Notice, Section, Skeleton, Surface } from "@/components/ui"

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

/** Same meter as the home diet card: ink fill, danger once over the goal. */
function Meter({ value, warn, label }: { value: number; warn: boolean; label: string }) {
    return (
        <div className="h-1.5 overflow-hidden rounded-full bg-hairline" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
            <div className={`h-full rounded-full ${warn ? "bg-danger" : "bg-ink"}`} style={{ width: `${Math.min(value, 100)}%` }} />
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
    const [showManualModal, setShowManualModal] = useState(false)
    const [nutritionRefreshKey, setNutritionRefreshKey] = useState(0)

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
    const handleManualSaved = () => {
        dietApiClient.getToday().then(setSummary).catch(() => setSummary(null))
        setNutritionRefreshKey((k) => k + 1)
    }

    const goalLink = (
        <Link href="/my?tab=nutrition" className="font-bold text-ink underline underline-offset-2">
            목표 정하기
        </Link>
    )

    return (
        <div className="flex flex-1 flex-col gap-7 bg-ground px-4 pb-24 pt-5">
            {showManualModal && (
                <ManualEntryModal defaultDate={today} onClose={() => setShowManualModal(false)} onSaved={handleManualSaved} />
            )}

            <h1 className="text-title font-bold text-ink">영양</h1>

            <Section title="오늘 영양">
                {loading ? (
                    <Surface className="flex flex-col gap-3" aria-busy="true">
                        <Skeleton className="h-8 w-36" />
                        <Skeleton className="h-1.5 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </Surface>
                ) : error ? (
                    <Notice tone="danger" title="영양 기록을 불러오지 못했어요">
                        잠시 후 이 화면을 다시 열어 주세요.
                    </Notice>
                ) : (
                    <Surface className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <p className="flex items-baseline gap-1.5">
                                <span className="text-headline font-bold tabular-nums text-ink">{totalKcal.toLocaleString()}</span>
                                <span className="text-body-sm tabular-nums text-ink-2">
                                    {hasKcalGoal ? `/ ${kcalGoal.toLocaleString()} kcal` : "kcal"}
                                </span>
                            </p>
                            {hasKcalGoal ? (
                                <>
                                    <Meter label="목표 대비 칼로리" value={dailyPercent} warn={totalKcal > kcalGoal} />
                                    <p className={`text-body-sm font-medium tabular-nums ${remainingKcal! >= 0 ? "text-ink-2" : "text-danger-ink"}`}>
                                        {remainingKcal! >= 0
                                            ? `${formatKcal(remainingKcal!)} 남았어요`
                                            : `${formatKcal(Math.abs(remainingKcal!))} 넘었어요`}
                                    </p>
                                </>
                            ) : (
                                <p className="text-caption text-ink-2">
                                    목표 칼로리를 정하면 목표 대비 섭취량을 볼 수 있어요. {goalLink}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 border-t border-hairline pt-3">
                            {[
                                ["탄수화물", summary?.totalCarbsG ?? 0],
                                ["단백질", summary?.totalProteinG ?? 0],
                                ["지방", summary?.totalFatG ?? 0],
                            ].map(([label, value]) => (
                                <div key={label} className="flex flex-col">
                                    <span className="text-caption text-ink-2">{label}</span>
                                    <span className="text-title-sm font-bold tabular-nums text-ink">
                                        {value}
                                        <span className="ml-0.5 text-caption font-normal text-ink-2">g</span>
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setShowManualModal(true)}>
                                직접 기록
                            </Button>
                            <ButtonLink href="/ai_quicklog" variant="primary" icon={<Sparkles className="size-4" aria-hidden />}>
                                말로 기록
                            </ButtonLink>
                        </div>
                    </Surface>
                )}
            </Section>

            <Section title="이번 주 칼로리">
                {loading ? (
                    <Surface className="flex flex-col gap-3" aria-busy="true">
                        <Skeleton className="h-5 w-52" />
                        <Skeleton className="h-1.5 w-full" />
                    </Surface>
                ) : weeklyGoal ? (
                    <Surface className="flex flex-col gap-2">
                        <p className="flex flex-wrap items-baseline gap-x-1.5">
                            <span className="text-title-sm font-bold tabular-nums text-ink">{Math.round(weeklyTotal).toLocaleString()}</span>
                            <span className="text-body-sm tabular-nums text-ink-2">/ {formatKcal(weeklyGoal)}</span>
                        </p>
                        <Meter label="주간 목표 대비 칼로리" value={weeklyPercent ?? 0} warn={weeklyTotal > weeklyGoal} />
                        <p className="text-caption tabular-nums text-ink-2">
                            {weekRange.start} ~ {weekRange.end}
                        </p>
                    </Surface>
                ) : (
                    <Surface className="flex flex-col gap-3">
                        <div>
                            <p className="text-body font-bold text-ink">목표 칼로리가 아직 없어요</p>
                            <p className="mt-0.5 text-body-sm text-ink-2">목표를 정하면 이번 주 섭취량을 목표와 비교할 수 있어요.</p>
                        </div>
                        <ButtonLink href="/my?tab=nutrition" variant="secondary" className="self-start">
                            목표 정하기
                        </ButtonLink>
                    </Surface>
                )}
            </Section>

            <section>
                <NutritionTab date={today} hideSummary title="오늘 식단 기록" dataRefreshKey={nutritionRefreshKey} />
            </section>

            <Section title="식단 캘린더">
                <NutritionCalendarSection />
            </Section>
        </div>
    )
}
