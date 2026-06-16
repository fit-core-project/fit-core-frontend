"use client"

import { startTransition, useCallback, useEffect, useState } from "react"
import { Plus, Utensils } from "lucide-react"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import type { DietLogResponse, DietSummaryResponse } from "@/types/project"
import ManualEntryModal from "@/app/my/nutrition/ManualEntryModal"

const MEAL_ORDER: Record<string, number> = {
    breakfast: 0,
    lunch: 1,
    dinner: 2,
    snack: 3,
}

const MEAL_LABEL: Record<string, string> = {
    breakfast: "아침",
    lunch: "점심",
    dinner: "저녁",
    snack: "간식",
}

function getMealLabel(mealType: string | null | undefined): string {
    if (!mealType) return "기타"
    return MEAL_LABEL[mealType] ?? mealType
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
            label: getMealLabel(key === "__null__" ? null : key),
            items: [...logs].sort((a, b) => {
                if (!a.loggedAt && !b.loggedAt) return 0
                if (!a.loggedAt) return 1
                if (!b.loggedAt) return -1
                return a.loggedAt.localeCompare(b.loggedAt)
            }),
        }))
}

export default function NutritionTab() {
    const [summary, setSummary] = useState<DietSummaryResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [showModal, setShowModal] = useState(false)

    const fetchToday = useCallback(() => {
        startTransition(() => {
            setLoading(true)
            setError(false)
        })
        dietApiClient
            .getToday()
            .then((data) => startTransition(() => setSummary(data)))
            .catch(() => startTransition(() => setError(true)))
            .finally(() => startTransition(() => setLoading(false)))
    }, [])

    useEffect(() => {
        fetchToday()
    }, [fetchToday])

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="mb-3 h-9 w-28 animate-pulse rounded bg-slate-200" />
                    <div className="mb-1 mt-3 h-3 w-full animate-pulse rounded-full bg-slate-100" />
                    <div className="mb-5 h-3 w-48 animate-pulse rounded bg-slate-100" />
                    <div className="grid grid-cols-3 gap-4">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <div className="h-3 w-12 animate-pulse rounded bg-slate-200" />
                                <div className="h-5 w-10 animate-pulse rounded bg-slate-100" />
                            </div>
                        ))}
                    </div>
                </div>
                {[0, 1].map((i) => (
                    <div key={i} className="rounded-2xl bg-white p-5 shadow-sm">
                        <div className="mb-3 h-4 w-14 animate-pulse rounded bg-slate-200" />
                        {[0, 1].map((j) => (
                            <div key={j} className="mb-2 h-12 animate-pulse rounded bg-slate-100" />
                        ))}
                    </div>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-slate-400">
                <Utensils size={36} strokeWidth={1.5} />
                <p className="text-sm">데이터를 불러오지 못했습니다.</p>
                <button
                    type="button"
                    onClick={fetchToday}
                    className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white"
                >
                    다시 시도
                </button>
            </div>
        )
    }

    const groups = summary ? groupByMeal(summary.items) : []
    const isEmpty = !summary || summary.items.length === 0

    return (
        <>
        {showModal && (
            <ManualEntryModal
                onClose={() => setShowModal(false)}
                onSaved={fetchToday}
            />
        )}
        <div className="space-y-4">
            {/* 상단 추가 버튼 */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-1 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
                >
                    <Plus size={13} />
                    추가
                </button>
            </div>
            {/* 매크로 요약 */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-800">{summary?.totalKcal ?? 0}</span>
                    <span className="text-sm font-semibold text-slate-400">kcal</span>
                </div>

                <div className="mb-1 mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-0 rounded-full bg-slate-300" />
                </div>
                <p className="mb-5 text-[11px] text-slate-400">목표를 설정하면 진행률이 표시됩니다</p>

                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center">
                        <span className="mb-1 text-xs font-bold text-slate-400">탄수화물</span>
                        <span className="text-sm font-extrabold text-slate-700">
                            {summary?.totalCarbsG ?? 0}
                            <span className="ml-0.5 text-[10px] font-normal text-slate-400">g</span>
                        </span>
                    </div>
                    <div className="flex flex-col items-center border-l border-r border-slate-100">
                        <span className="mb-1 text-xs font-bold text-slate-400">단백질</span>
                        <span className="text-sm font-extrabold text-slate-700">
                            {summary?.totalProteinG ?? 0}
                            <span className="ml-0.5 text-[10px] font-normal text-slate-400">g</span>
                        </span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="mb-1 text-xs font-bold text-slate-400">지방</span>
                        <span className="text-sm font-extrabold text-slate-700">
                            {summary?.totalFatG ?? 0}
                            <span className="ml-0.5 text-[10px] font-normal text-slate-400">g</span>
                        </span>
                    </div>
                </div>
            </div>

            {isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white py-12 shadow-sm">
                    <Utensils size={32} strokeWidth={1.5} className="text-slate-300" />
                    <p className="text-sm text-slate-400">오늘 기록이 없어요</p>
                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white"
                    >
                        <Plus size={14} />
                        첫 식단 기록하기
                    </button>
                </div>
            ) : (
                <>
                    {groups.map((group) => (
                        <div key={group.key} className="rounded-2xl bg-white p-5 shadow-sm">
                            <h3 className="mb-3 text-sm font-bold text-slate-800">{group.label}</h3>
                            <div className="space-y-2">
                                {group.items.map((item) => {
                                    const amount = formatAmount(item)
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    {item.foodName}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {amount && `${amount} · `}탄 {item.carbsG ?? 0}g · 단{" "}
                                                    {item.proteinG ?? 0}g · 지 {item.fatG ?? 0}g
                                                </p>
                                            </div>
                                            <span className="ml-3 shrink-0 text-sm font-bold text-slate-600">
                                                {item.kcal}
                                                <span className="ml-0.5 text-[10px] font-normal text-slate-400">
                                                    kcal
                                                </span>
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-500"
                    >
                        <Plus size={16} />
                        식단 추가
                    </button>
                </>
            )}
        </div>
        </>
    )
}
