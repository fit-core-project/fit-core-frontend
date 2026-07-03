"use client"

import { startTransition, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Apple, Plus } from "lucide-react"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import type { DietSummaryResponse, NutritionTarget } from "@/types/project"

function kcalBarPct(current: number, goal: number | null | undefined): number {
    if (!goal) return 0
    return Math.min((current / goal) * 100, 100)
}

function kcalBarColor(current: number, goal: number | null | undefined): string {
    if (!goal) return "bg-slate-300"
    return current > goal ? "bg-red-400" : "bg-emerald-400"
}

function upperBarColor(current: number, max: number | null | undefined): string {
    if (max == null) return "bg-slate-300"
    return current > max ? "bg-red-400" : "bg-emerald-400"
}

function upperBarPct(current: number, max: number | null | undefined): number {
    if (!max) return 0
    return Math.min((current / max) * 100, 100)
}

function fiberBarColor(current: number, min: number | null | undefined): string {
    if (min == null) return "bg-slate-300"
    return current < min ? "bg-amber-400" : "bg-emerald-400"
}

function fiberBarPct(current: number, min: number | null | undefined): number {
    if (!min) return 0
    return Math.min((current / min) * 100, 100)
}

export default function DietSummaryCard({
    showDetails = true,
    onManualAdd,
    onAiLog,
    refreshKey,
}: {
    showDetails?: boolean
    onManualAdd?: () => void
    onAiLog?: () => void
    refreshKey?: number
}) {
    const router = useRouter()
    const [summary, setSummary] = useState<DietSummaryResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [target, setTarget] = useState<NutritionTarget | null>(null)
    const [showDietOptions, setShowDietOptions] = useState(false)

    useEffect(() => {
        startTransition(() => {
            setLoading(true)
            setError(false)
        })
        dietApiClient
            .getToday()
            .then((data) => startTransition(() => setSummary(data)))
            .catch(() => startTransition(() => setError(true)))
            .finally(() => startTransition(() => setLoading(false)))

        nutritionTargetApiClient.getTarget().then((t) => startTransition(() => setTarget(t)))
    }, [refreshKey])

    const handleClick = () => router.push("/nutrition")

    const totalKcal = summary?.totalKcal ?? 0
    const totalCarbsG = summary?.totalCarbsG ?? 0
    const totalProteinG = summary?.totalProteinG ?? 0
    const totalFatG = summary?.totalFatG ?? 0

    const hasKcalGoal = !!target?.kcalGoal
    const barPct = kcalBarPct(totalKcal, target?.kcalGoal)
    const barColor = kcalBarColor(totalKcal, target?.kcalGoal)

    return (
        <section>
            <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="text-lg font-bold text-slate-800">오늘의 영양</h2>
                <button
                    type="button"
                    onClick={() => setShowDietOptions(true)}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                >
                    <Plus className="h-3.5 w-3.5" />
                    식단 기록
                </button>
            </div>

            {loading && (
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="w-full h-3 bg-slate-100 rounded-full mb-6 animate-pulse" />
                    <div className="grid grid-cols-3 gap-4">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <div className="h-3 w-12 animate-pulse rounded bg-slate-200" />
                                <div className="h-5 w-10 animate-pulse rounded bg-slate-100" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 py-6 text-center">
                    <p className="text-sm text-slate-400">데이터를 불러오지 못했습니다.</p>
                </div>
            )}

            {!loading && !error && (!summary || summary.items.length === 0) && (
                onManualAdd ? (
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                        <p className="text-sm font-bold text-slate-800">오늘 식단 기록이 없어요.</p>
                        <p className="mt-1 text-sm text-slate-500">식단을 기록해 영양 목표를 확인해 보세요.</p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={onManualAdd}
                                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                <Plus className="h-4 w-4" />
                                직접 식단 기록
                            </button>
                            <button
                                type="button"
                                onClick={onAiLog}
                                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                            >
                                <Apple className="h-4 w-4" />
                                AI로 식단 기록
                            </button>
                        </div>
                        {!hasKcalGoal && (
                            <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                                <span>목표 칼로리를 설정하면 식단 기록을 더 의미 있게 추적할 수 있어요. </span>
                                <Link
                                    href="/my?tab=nutrition"
                                    className="font-medium text-emerald-600 hover:text-emerald-700"
                                >
                                    영양 목표 설정 →
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        className="w-full bg-white p-5 rounded-3xl shadow-sm border border-slate-100 py-6 text-center cursor-pointer hover:shadow-md transition-all"
                        onClick={handleClick}
                    >
                        <p className="text-sm text-slate-400">오늘 기록 없어요</p>
                    </button>
                )
            )}

            {!loading && !error && summary && summary.items.length > 0 && (
                <button
                    type="button"
                    className="w-full bg-white p-5 rounded-3xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all"
                    onClick={handleClick}
                >
                    {/* 탄/단/지 요약 */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-400 mb-0.5">탄수화물</span>
                            <span className="text-[21px] font-extrabold text-slate-700">
                                {totalCarbsG}
                                <span className="text-[13px] text-slate-400 ml-0.5">g</span>
                            </span>
                        </div>
                        <div className="flex flex-col items-center border-l border-r border-slate-100">
                            <span className="text-xs font-bold text-emerald-500 mb-0.5">단백질</span>
                            <span className="text-[21px] font-extrabold text-slate-700">
                                {totalProteinG}
                                <span className="text-[13px] text-slate-400 ml-0.5">g</span>
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-400 mb-0.5">지방</span>
                            <span className="text-[21px] font-extrabold text-slate-700">
                                {totalFatG}
                                <span className="text-[13px] text-slate-400 ml-0.5">g</span>
                            </span>
                        </div>
                    </div>

                    {/* 구분선 */}
                    <div className="mx-3 my-2 border-t border-slate-100" />

                    {/* kcal 진행 바 + 칼로리 (우측 상단) */}
                    <div className="mt-1">
                        <div className="flex justify-end mb-0.5">
                            <span className="text-[13px] font-semibold text-slate-400">
                                {totalKcal.toLocaleString()}
                                {hasKcalGoal && ` / ${target!.kcalGoal!.toLocaleString()}`} kcal
                            </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: hasKcalGoal ? `${barPct}%` : "0%" }}
                            />
                        </div>
                    </div>

                    {/* 추가 영양소 소섹션 */}
                    {showDetails && (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                        <div className="flex justify-around">
                            <div className="flex flex-col items-center w-1/3 px-2">
                                <span className="text-[10px] text-slate-400">당류</span>
                                <span className="text-[15px] font-semibold text-slate-700">
                                    {Number(summary?.totalSugarG ?? 0)}
                                    <span className="text-[13px] font-normal text-slate-400 ml-0.5">g</span>
                                </span>
                                {target?.sugarMax != null && (
                                    <span className="text-[10px] text-slate-400">~{target.sugarMax}g</span>
                                )}
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${upperBarColor(Number(summary?.totalSugarG ?? 0), target?.sugarMax)}`}
                                        style={{ width: `${upperBarPct(Number(summary?.totalSugarG ?? 0), target?.sugarMax)}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col items-center w-1/3 px-2">
                                <span className="text-[10px] text-slate-400">식이섬유</span>
                                <span className="text-[15px] font-semibold text-slate-700">
                                    {Number(summary?.totalFiberG ?? 0)}
                                    <span className="text-[13px] font-normal text-slate-400 ml-0.5">g</span>
                                </span>
                                {target?.fiberMin != null && (
                                    <span className="text-[10px] text-slate-400">{target.fiberMin}g~</span>
                                )}
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${fiberBarColor(Number(summary?.totalFiberG ?? 0), target?.fiberMin)}`}
                                        style={{ width: `${fiberBarPct(Number(summary?.totalFiberG ?? 0), target?.fiberMin)}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col items-center w-1/3 px-2">
                                <span className="text-[10px] text-slate-400">나트륨</span>
                                <span className="text-[15px] font-semibold text-slate-700">
                                    {summary?.totalSodiumMg ?? 0}
                                    <span className="text-[13px] font-normal text-slate-400 ml-0.5">mg</span>
                                </span>
                                {target?.sodiumMax != null && (
                                    <span className="text-[10px] text-slate-400">~{target.sodiumMax}mg</span>
                                )}
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${upperBarColor(summary?.totalSodiumMg ?? 0, target?.sodiumMax)}`}
                                        style={{ width: `${upperBarPct(summary?.totalSodiumMg ?? 0, target?.sodiumMax)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-300 text-center">
                            당류·식이섬유·나트륨은 DB 매칭 항목만 집계
                        </p>
                    </div>
                    )}
                </button>
            )}
            {!hasKcalGoal && !loading && !error && summary && summary.items.length > 0 && (
                <div className="mt-2 px-1 text-xs text-slate-500">
                    <span>목표 칼로리를 설정하면 섭취량을 목표와 비교할 수 있어요. </span>
                    <Link
                        href="/my?tab=nutrition"
                        className="font-medium text-amber-700 hover:text-amber-800"
                    >
                        목표 칼로리 설정하기 →
                    </Link>
                </div>
            )}
            {showDietOptions && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
                    onClick={() => setShowDietOptions(false)}
                >
                    <div
                        className="w-full max-w-[480px] rounded-t-3xl bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="mb-4 text-center text-base font-bold text-slate-800">식단 기록 방법 선택</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDietOptions(false)
                                    onManualAdd?.()
                                }}
                                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                <Plus className="h-4 w-4" />
                                직접 식단 기록
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDietOptions(false)
                                    if (onAiLog) onAiLog()
                                    else router.push("/ai_quicklog")
                                }}
                                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                            >
                                <Apple className="h-4 w-4" />
                                AI로 식단 기록
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
