"use client"

import { startTransition, useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Utensils } from "lucide-react"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import type { DietLogResponse, DietSummaryResponse, NutritionTarget } from "@/types/project"
import ManualEntryModal from "@/app/my/nutrition/ManualEntryModal"
import { mealLabel } from "@/utils/displayLabels"
import { Button, EmptyState, Notice, Skeleton, Surface, Tag } from "@/components/ui"

function getKstToday(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

const MEAL_ORDER: Record<string, number> = {
    breakfast: 0,
    lunch: 1,
    dinner: 2,
    snack: 3,
}

function SourceTag({ source }: { source?: string | null }) {
    if (source === "db") return <Tag>식품 DB</Tag>
    if (source === "manual") return <Tag>직접 입력</Tag>
    return <Tag>AI 추정</Tag>
}

/** Same meter as the home diet card: ink fill, danger once over the limit. */
function Meter({ value, warn, label }: { value: number; warn: boolean; label: string }) {
    return (
        <div className="h-1.5 overflow-hidden rounded-full bg-hairline" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
            <div className={`h-full rounded-full ${warn ? "bg-danger" : "bg-ink"}`} style={{ width: `${value}%` }} />
        </div>
    )
}

function getMealOrder(mealType: string | null | undefined): number {
    if (!mealType) return 99
    return MEAL_ORDER[mealType] ?? 50
}

function formatAmount(item: DietLogResponse): string {
    if (item.amountRaw) return item.amountRaw
    if (item.amountG != null) return `${item.amountG}g`
    return ""
}

function groupByMeal(items: DietLogResponse[]) {
    const map = new Map<string, DietLogResponse[]>()
    for (const item of items) {
        const key = item.mealType ?? "__null__"
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(item)
    }
    return [...map.entries()]
        .sort(([a], [b]) => getMealOrder(a === "__null__" ? null : a) - getMealOrder(b === "__null__" ? null : b))
        .map(([key, logs]) => ({
            key,
            label: mealLabel(key === "__null__" ? null : key),
            items: [...logs].sort((a, b) => {
                if (!a.loggedAt && !b.loggedAt) return 0
                if (!a.loggedAt) return 1
                if (!b.loggedAt) return -1
                return a.loggedAt.localeCompare(b.loggedAt)
            }),
        }))
}

function kcalBarPct(current: number, goal: number | null | undefined): number {
    if (!goal) return 0
    return Math.min((current / goal) * 100, 100)
}

type MacroStatus = "normal" | "under" | "over" | "neutral"

function macroStatus(
    current: number,
    min: number | null | undefined,
    max: number | null | undefined,
    isProtein = false,
): MacroStatus {
    if (min == null && max == null) return "neutral"
    if (max != null && current > max && !isProtein) return "over"
    if (min != null && current < min) return "under"
    return "normal"
}

function macroBarPct(current: number, min: number | null | undefined, max: number | null | undefined): number {
    const ref = max ?? min
    if (!ref) return 0
    return Math.min((current / ref) * 100, 100)
}

function macroGoalText(min: number | null | undefined, max: number | null | undefined): string | null {
    if (min != null && max != null) return `${min}~${max}g`
    if (max != null) return `~${max}g`
    if (min != null) return `${min}g~`
    return null
}

interface NutritionTabProps {
    date?: string
    onRefresh?: () => void
    targetRefreshKey?: number
    dataRefreshKey?: number
    hideSummary?: boolean
    /** Renders the section heading with the add action in the same row. */
    title?: string
}

export default function NutritionTab({ date, onRefresh, targetRefreshKey = 0, dataRefreshKey = 0, hideSummary = false, title }: NutritionTabProps = {}) {
    const today = getKstToday()
    const resolvedDate = useMemo(() => date ?? today, [date, today])
    const isToday = resolvedDate === today

    const [summary, setSummary] = useState<DietSummaryResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState<DietLogResponse | null>(null)
    const [target, setTarget] = useState<NutritionTarget | null>(null)

    const fetchData = useCallback(() => {
        startTransition(() => {
            setLoading(true)
            setError(false)
        })
        dietApiClient
            .getSummary(resolvedDate)
            .then((data) => startTransition(() => setSummary(data)))
            .catch(() => startTransition(() => setError(true)))
            .finally(() => startTransition(() => setLoading(false)))
    }, [resolvedDate])

    const handleSaved = useCallback(() => {
        fetchData()
        onRefresh?.()
    }, [fetchData, onRefresh])

    useEffect(() => {
        fetchData()
    }, [fetchData, dataRefreshKey])

    useEffect(() => {
        nutritionTargetApiClient
            .getTarget()
            .then((t) => startTransition(() => setTarget(t)))
            .catch(() => startTransition(() => setTarget(null)))
    }, [targetRefreshKey])

    const totalKcal = summary?.totalKcal ?? 0
    const totalCarbsG = Number(summary?.totalCarbsG ?? 0)
    const totalProteinG = Number(summary?.totalProteinG ?? 0)
    const totalFatG = Number(summary?.totalFatG ?? 0)

    const kcalPct = kcalBarPct(totalKcal, target?.kcalGoal)
    const hasKcalGoal = !!target?.kcalGoal

    const proteinStatus = macroStatus(totalProteinG, target?.proteinGMin, target?.proteinGMax, true)
    const carbsStatus = macroStatus(totalCarbsG, target?.carbsGMin, target?.carbsGMax)
    const fatStatus = macroStatus(totalFatG, target?.fatGMin, target?.fatGMax)

    const proteinPct = macroBarPct(totalProteinG, target?.proteinGMin, target?.proteinGMax)
    const carbsPct = macroBarPct(totalCarbsG, target?.carbsGMin, target?.carbsGMax)
    const fatPct = macroBarPct(totalFatG, target?.fatGMin, target?.fatGMax)

    if (loading) {
        return (
            <div className="flex flex-col gap-3" aria-busy="true">
                {!hideSummary && (
                    <Surface className="flex flex-col gap-3">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-1.5 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </Surface>
                )}
                {[0, 1].map((i) => (
                    <Surface key={i} className="flex flex-col gap-2">
                        <Skeleton className="h-5 w-14" />
                        <Skeleton className="h-12 w-full" />
                    </Surface>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <Notice tone="danger" title="식단 기록을 불러오지 못했어요" className="flex flex-col gap-2">
                <span>연결을 확인하고 다시 불러와 주세요.</span>
                <Button variant="secondary" onClick={fetchData} className="self-start">
                    다시 불러오기
                </Button>
            </Notice>
        )
    }

    const groups = summary ? groupByMeal(summary.items) : []
    const isEmpty = !summary || summary.items.length === 0

    const macros = [
        { label: "탄수화물", value: totalCarbsG, min: target?.carbsGMin, max: target?.carbsGMax, status: carbsStatus, pct: carbsPct },
        { label: "단백질", value: totalProteinG, min: target?.proteinGMin, max: target?.proteinGMax, status: proteinStatus, pct: proteinPct },
        { label: "지방", value: totalFatG, min: target?.fatGMin, max: target?.fatGMax, status: fatStatus, pct: fatPct },
    ]

    const addButton = (
        <Button variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setShowModal(true)}>
            식단 추가
        </Button>
    )

    return (
        <>
            {showModal && <ManualEntryModal onClose={() => setShowModal(false)} onSaved={handleSaved} defaultDate={resolvedDate} />}
            {editItem && <ManualEntryModal editItem={editItem} onClose={() => setEditItem(null)} onSaved={handleSaved} />}
            <div className="flex flex-col gap-3">
                {title && (
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-title-sm font-bold text-ink">{title}</h2>
                        {!isEmpty && (
                            <Button variant="ghost" className="-mr-2" icon={<Plus className="size-4" aria-hidden />} onClick={() => setShowModal(true)}>
                                추가
                            </Button>
                        )}
                    </div>
                )}
                {!hideSummary && (
                    <Surface className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <p className="flex items-baseline gap-1.5">
                                <span className="text-headline font-bold tabular-nums text-ink">{totalKcal.toLocaleString()}</span>
                                <span className="text-body-sm tabular-nums text-ink-2">
                                    {hasKcalGoal ? `/ ${target!.kcalGoal!.toLocaleString()} kcal` : "kcal"}
                                </span>
                            </p>
                            {hasKcalGoal ? (
                                <Meter label="목표 대비 칼로리" value={kcalPct} warn={totalKcal > target!.kcalGoal!} />
                            ) : (
                                <p className="text-caption text-ink-2">목표 칼로리를 정하면 목표 대비 섭취량을 볼 수 있어요.</p>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-3 border-t border-hairline pt-3">
                            {macros.map((macro) => {
                                const goal = macroGoalText(macro.min, macro.max)
                                return (
                                    <div key={macro.label} className="flex flex-col gap-1">
                                        <span className="text-caption text-ink-2">{macro.label}</span>
                                        <span className="text-title-sm font-bold tabular-nums text-ink">
                                            {macro.value}
                                            <span className="ml-0.5 text-caption font-normal text-ink-2">g</span>
                                        </span>
                                        {goal && (
                                            <>
                                                <Meter label={`${macro.label} 목표 대비`} value={macro.pct} warn={macro.status === "over"} />
                                                <span className="text-caption tabular-nums text-ink-2">{goal}</span>
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </Surface>
                )}

                {isEmpty ? (
                    <Surface>
                        <EmptyState
                            className="py-4"
                            icon={<Utensils aria-hidden />}
                            title={isToday ? "오늘 식단 기록이 없어요" : `${resolvedDate} 기록이 없어요`}
                            body="먹은 음식을 추가하면 끼니별로 모아서 보여 줘요."
                            action={addButton}
                        />
                    </Surface>
                ) : (
                    <>
                        {!title && <div className="flex justify-end">{addButton}</div>}
                        {groups.map((group) => (
                            <Surface key={group.key} padded={false}>
                                <h3 className="px-4 pb-1 pt-3 text-body-sm font-bold text-ink">{group.label}</h3>
                                <ul className="divide-y divide-hairline">
                                    {group.items.map((item) => {
                                        const amount = formatAmount(item)
                                        const micros = [
                                            item.sugarG != null && `당류 ${item.sugarG}g`,
                                            item.fiberG != null && `식이섬유 ${item.fiberG}g`,
                                            item.sodiumMg != null && `나트륨 ${item.sodiumMg}mg`,
                                        ].filter(Boolean)
                                        return (
                                            <li key={item.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditItem(item)}
                                                    aria-label={`${item.foodName} 기록 수정`}
                                                    className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface"
                                                >
                                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                        <span className="flex flex-wrap items-center gap-1.5">
                                                            <span className="truncate text-body-sm font-bold text-ink">{item.foodName}</span>
                                                            <SourceTag source={item.source} />
                                                        </span>
                                                        <span className="text-caption tabular-nums text-ink-2">
                                                            {amount && `${amount} · `}탄 {item.carbsG ?? 0}g · 단 {item.proteinG ?? 0}g · 지 {item.fatG ?? 0}g
                                                        </span>
                                                        {micros.length > 0 && (
                                                            <span className="text-caption tabular-nums text-ink-2">{micros.join(" · ")}</span>
                                                        )}
                                                    </span>
                                                    <span className="shrink-0 text-body font-bold tabular-nums text-ink">
                                                        {item.kcal}
                                                        <span className="ml-0.5 text-caption font-normal text-ink-2">kcal</span>
                                                    </span>
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </Surface>
                        ))}
                    </>
                )}
            </div>
        </>
    )
}
