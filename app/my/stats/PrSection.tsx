"use client"

import { useEffect, useState } from "react"
import { Trophy } from "lucide-react"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import { PrResponse } from "@/types/project"
import { useSettingsStore } from "@/store/settingsStore"

function toDisplay(kg: number, unit: "kg" | "lbs") {
    if (unit === "lbs") return Math.round(kg * 2.20462)
    return kg
}

export default function PrSection() {
    const [prs, setPrs] = useState<PrResponse[]>([])
    const [loading, setLoading] = useState(true)
    const { weightUnit } = useSettingsStore()

    useEffect(() => {
        workoutApiClient
            .getPrs()
            .then(setPrs)
            .catch(() => setPrs([]))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-4 h-5 w-32 animate-pulse rounded bg-slate-200" />
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="mb-3 h-10 animate-pulse rounded bg-slate-100" />
                ))}
            </div>
        )
    }

    return (
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">종목별 개인 최고 기록 (추정 1RM)</h3>
            </div>

            {prs.length === 0 ? (
                <p className="text-center text-sm text-slate-400">아직 기록된 운동 세트가 없습니다.</p>
            ) : (
                <div className="space-y-2">
                    {prs.map((pr) => (
                        <div
                            key={pr.exerciseId}
                            className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                    {pr.exerciseNameSnapshot}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {toDisplay(pr.weightKg, weightUnit)}{weightUnit} × {pr.reps}rep · {pr.achievedDate}
                                </p>
                            </div>
                            <span className="ml-3 shrink-0 text-base font-bold text-blue-600">
                                {toDisplay(pr.estimated1RM, weightUnit)}{weightUnit}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
