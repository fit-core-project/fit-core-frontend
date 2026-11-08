"use client"

import { useEffect, useState } from "react"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import { PrResponse } from "@/types/project"
import { useSettingsStore } from "@/store/settingsStore"
import { EmptyState, Section, Skeleton, Surface } from "@/components/ui"

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

    return (
        <Section title="종목별 최고 기록">
            <p className="-mt-2 text-body-sm text-ink-2">세트 기록으로 추정한 1RM이에요.</p>
            {loading ? (
                <Surface className="flex flex-col gap-3" aria-busy="true">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-11 w-full" />
                    ))}
                </Surface>
            ) : prs.length === 0 ? (
                <Surface>
                    <EmptyState title="아직 최고 기록이 없어요" body="운동 세트를 기록하면 종목별 추정 1RM이 계산돼요." />
                </Surface>
            ) : (
                <Surface padded={false}>
                    <ul className="divide-y divide-hairline">
                        {prs.map((pr) => (
                            <li key={pr.exerciseId} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-body font-medium text-ink">{pr.exerciseNameSnapshot}</p>
                                    <p className="text-body-sm tabular-nums text-ink-2">
                                        {toDisplay(pr.weightKg, weightUnit)}
                                        {weightUnit} × {pr.reps}회 · {pr.achievedDate}
                                    </p>
                                </div>
                                <span className="shrink-0 text-title-sm font-bold tabular-nums text-ink">
                                    {toDisplay(pr.estimated1RM, weightUnit)}
                                    <span className="ml-0.5 text-body-sm font-medium text-ink-2">{weightUnit}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </Surface>
            )}
        </Section>
    )
}
