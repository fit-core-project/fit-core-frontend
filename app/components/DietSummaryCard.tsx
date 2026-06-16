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
                </div>
            )}
        </section>
    )
}
