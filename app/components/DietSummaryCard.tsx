"use client"

import { startTransition, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

export default function DietSummaryCard() {
    const router = useRouter()
    const [summary, setSummary] = useState<DietSummaryResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [target, setTarget] = useState<NutritionTarget | null>(null)

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
    }, [])

    const handleClick = () => router.push("/my?tab=nutrition")

    const totalKcal = summary?.totalKcal ?? 0
    const totalCarbsG = summary?.totalCarbsG ?? 0
    const totalProteinG = summary?.totalProteinG ?? 0
    const totalFatG = summary?.totalFatG ?? 0

    const hasKcalGoal = !!target?.kcalGoal
    const barPct = kcalBarPct(totalKcal, target?.kcalGoal)
    const barColor = kcalBarColor(totalKcal, target?.kcalGoal)

    return (
        <section>
            <div className="flex justify-between items-end mb-3 px-1">
                <h2 className="text-lg font-bold text-slate-800">오늘의 영양</h2>
                {!loading && !error && (
                    <span className="text-xs font-semibold text-slate-400">
                        {totalKcal.toLocaleString()}
                        {hasKcalGoal && ` / ${target!.kcalGoal!.toLocaleString()}`} kcal
                    </span>
                )}
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
                <div
                    className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 py-6 text-center cursor-pointer hover:shadow-md transition-all"
                    onClick={handleClick}
                >
                    <p className="text-sm text-slate-400">오늘 기록 없어요</p>
                </div>
            )}

            {!loading && !error && summary && summary.items.length > 0 && (
                <div
                    className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all"
                    onClick={handleClick}
                >
                    {/* kcal 진행 바 */}
                    <div className="w-full h-3 bg-slate-100 rounded-full mb-6 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: hasKcalGoal ? `${barPct}%` : "0%" }}
                        />
                    </div>

                    {/* 탄/단/지 요약 */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-400 mb-1">탄수화물</span>
                            <span className="text-sm font-extrabold text-slate-700">
                                {totalCarbsG}
                                <span className="text-[10px] text-slate-400 ml-0.5">g</span>
                            </span>
                        </div>
                        <div className="flex flex-col items-center border-l border-r border-slate-100">
                            <span className="text-xs font-bold text-emerald-500 mb-1">단백질</span>
                            <span className="text-sm font-extrabold text-slate-700">
                                {totalProteinG}
                                <span className="text-[10px] text-slate-400 ml-0.5">g</span>
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-400 mb-1">지방</span>
                            <span className="text-sm font-extrabold text-slate-700">
                                {totalFatG}
                                <span className="text-[10px] text-slate-400 ml-0.5">g</span>
                            </span>
                        </div>
                    </div>

                    {/* 추가 영양소 소섹션 */}
                    <div className="mt-4 border-t border-slate-100 pt-3">
                        <div className="flex justify-around">
                            <div className="flex flex-col items-center w-1/3 px-2">
                                <span className="text-[10px] text-slate-400">당류</span>
                                <span className="text-xs font-semibold text-slate-700">
                                    {Number(summary?.totalSugarG ?? 0)}
                                    <span className="text-[10px] font-normal text-slate-400 ml-0.5">g</span>
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
                                <span className="text-xs font-semibold text-slate-700">
                                    {Number(summary?.totalFiberG ?? 0)}
                                    <span className="text-[10px] font-normal text-slate-400 ml-0.5">g</span>
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
                                <span className="text-xs font-semibold text-slate-700">
                                    {summary?.totalSodiumMg ?? 0}
                                    <span className="text-[10px] font-normal text-slate-400 ml-0.5">mg</span>
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
                </div>
            )}
        </section>
    )
}
