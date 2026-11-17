"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Sparkles } from "lucide-react"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import NutritionCalendarSection from "@/app/my/stats/NutritionCalendarSection"
import NutritionTab from "@/app/my/nutrition/NutritionTab"
import ManualEntryModal from "@/app/my/nutrition/ManualEntryModal"
import type { DietDailyAggregationResponse, DietSummaryResponse, NutritionTarget } from "@/types/project"
import { getKstToday } from "@/utils/date"
import { daysElapsedInWeek, getWeekRange, weeklyKcalGoalToDate } from "@/utils/nutritionGoal"
import { Button, ButtonLink, Notice, Section, Skeleton, Surface } from "@/components/ui"

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T }

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

function RetryNotice({ title, onRetry }: { title: string; onRetry: () => void }) {
    return (
        <Notice tone="danger" title={title}>
            <span className="flex flex-col gap-2">
                <span>연결을 확인하고 다시 불러와 주세요.</span>
                <Button variant="secondary" onClick={onRetry} className="self-start">
                    다시 불러오기
                </Button>
            </span>
        </Notice>
    )
}

/** Fetches one section; a failure here leaves the other sections alone. */
function useSectionLoad<T>(fetcher: () => Promise<T>): [Load<T>, () => void] {
    const [state, setState] = useState<Load<T>>({ status: "loading" })
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        let alive = true
        fetcher()
            .then((data) => alive && setState({ status: "ready", data }))
            .catch(() => alive && setState({ status: "error" }))
        return () => {
            alive = false
        }
    }, [fetcher, attempt])

    const reload = useCallback(() => {
        setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }))
        setAttempt((n) => n + 1)
    }, [])

    return [state, reload]
}

export default function NutritionPage() {
    const today = getKstToday()
    const weekRange = useMemo(() => getWeekRange(today), [today])

    const fetchSummary = useCallback(() => dietApiClient.getSummary(today), [today])
    const fetchTarget = useCallback(() => nutritionTargetApiClient.getTarget(), [])
    const fetchWeekly = useCallback(
        () => dietApiClient.getDailySummary(weekRange.start, weekRange.end).then((rows) => rows ?? []),
        [weekRange.start, weekRange.end],
    )

    const [summaryState, reloadSummary] = useSectionLoad<DietSummaryResponse>(fetchSummary)
    const [targetState, reloadTarget] = useSectionLoad<NutritionTarget | null>(fetchTarget)
    const [weeklyState, reloadWeekly] = useSectionLoad<DietDailyAggregationResponse[]>(fetchWeekly)

    const [showManualModal, setShowManualModal] = useState(false)
    const [listRefreshKey, setListRefreshKey] = useState(0)
    const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)

    /** Totals, week and calendar all derive from the logs; refresh them together after any write. */
    const refreshAggregates = useCallback(() => {
        reloadSummary()
        reloadWeekly()
        setCalendarRefreshKey((k) => k + 1)
    }, [reloadSummary, reloadWeekly])

    const handleManualSaved = useCallback(() => {
        refreshAggregates()
        setListRefreshKey((k) => k + 1)
    }, [refreshAggregates])

    /** Edit made inside the calendar's day view: today's list may show the same log. */
    const handleCalendarChanged = useCallback(() => {
        reloadSummary()
        reloadWeekly()
        setListRefreshKey((k) => k + 1)
    }, [reloadSummary, reloadWeekly])

    const summary = summaryState.status === "ready" ? summaryState.data : null
    const target = targetState.status === "ready" ? targetState.data : null
    const totalKcal = summary?.totalKcal ?? 0
    const kcalGoal = target?.kcalGoal ?? null
    const hasKcalGoal = kcalGoal != null && kcalGoal > 0
    const remainingKcal = hasKcalGoal ? kcalGoal - totalKcal : null
    const dailyPercent = hasKcalGoal ? Math.min((totalKcal / kcalGoal) * 100, 100) : 0

    const weeklyRows = weeklyState.status === "ready" ? weeklyState.data : []
    const weeklyTotal = weeklyRows.reduce((total, row) => total + row.totalKcal, 0)
    const daysElapsed = daysElapsedInWeek(today)
    const weeklyGoal = weeklyKcalGoalToDate(kcalGoal, today)
    const weeklyPercent = weeklyGoal ? Math.min((weeklyTotal / weeklyGoal) * 100, 100) : 0

    const goalLink = (
        <Link href="/my?tab=nutrition" className="font-bold text-ink underline underline-offset-2">
            목표 정하기
        </Link>
    )

    const actions = (
        <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setShowManualModal(true)}>
                직접 기록
            </Button>
            <ButtonLink href="/ai_quicklog" variant="primary" icon={<Sparkles className="size-4" aria-hidden />}>
                말로 기록
            </ButtonLink>
        </div>
    )

    return (
        <div className="flex flex-1 flex-col gap-7 bg-ground px-4 pb-24 pt-5">
            {showManualModal && (
                <ManualEntryModal defaultDate={today} onClose={() => setShowManualModal(false)} onSaved={handleManualSaved} />
            )}

            <div className="flex items-center justify-between gap-3">
                <h1 className="text-title font-bold text-ink">영양</h1>
                <Link
                    href="/my?tab=nutrition"
                    className="inline-flex min-h-11 items-center px-1 text-body-sm font-bold text-ink underline underline-offset-2"
                >
                    목표 수정
                </Link>
            </div>

            <Section title="오늘 영양">
                {summaryState.status === "loading" ? (
                    <Surface className="flex flex-col gap-3" aria-busy="true">
                        <Skeleton className="h-8 w-36" />
                        <Skeleton className="h-1.5 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </Surface>
                ) : summaryState.status === "error" ? (
                    <>
                        <RetryNotice title="오늘 영양 합계를 불러오지 못했어요" onRetry={reloadSummary} />
                        {actions}
                    </>
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
                            ) : targetState.status === "error" ? (
                                <p className="flex flex-wrap items-center gap-x-2 text-caption text-danger-ink">
                                    목표 칼로리를 불러오지 못했어요.
                                    <button type="button" onClick={reloadTarget} className="inline-flex min-h-11 items-center font-bold underline underline-offset-2">
                                        다시 불러오기
                                    </button>
                                </p>
                            ) : targetState.status === "loading" ? (
                                <Skeleton className="h-1.5 w-full" />
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

                        {actions}
                    </Surface>
                )}
            </Section>

            <Section title="이번 주 칼로리">
                {weeklyState.status === "loading" || targetState.status === "loading" ? (
                    <Surface className="flex flex-col gap-3" aria-busy="true">
                        <Skeleton className="h-5 w-52" />
                        <Skeleton className="h-1.5 w-full" />
                    </Surface>
                ) : weeklyState.status === "error" ? (
                    <RetryNotice title="이번 주 기록을 불러오지 못했어요" onRetry={reloadWeekly} />
                ) : targetState.status === "error" ? (
                    <RetryNotice title="목표 칼로리를 불러오지 못했어요" onRetry={reloadTarget} />
                ) : weeklyGoal ? (
                    <Surface className="flex flex-col gap-2">
                        <p className="flex flex-wrap items-baseline gap-x-1.5">
                            <span className="text-title-sm font-bold tabular-nums text-ink">{Math.round(weeklyTotal).toLocaleString()}</span>
                            <span className="text-body-sm tabular-nums text-ink-2">/ {formatKcal(weeklyGoal)}</span>
                        </p>
                        <Meter label="이번 주 지난 날짜 목표 대비 칼로리" value={weeklyPercent} warn={weeklyTotal > weeklyGoal} />
                        <p className="text-caption tabular-nums text-ink-2">
                            {weekRange.start} ~ {weekRange.end} · 오늘까지 {daysElapsed}일 목표 기준
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
                <NutritionTab date={today} hideSummary title="오늘 식단 기록" dataRefreshKey={listRefreshKey} onRefresh={refreshAggregates} />
            </section>

            <Section title="식단 캘린더">
                <NutritionCalendarSection refreshKey={calendarRefreshKey} onDataChanged={handleCalendarChanged} />
            </Section>
        </div>
    )
}
