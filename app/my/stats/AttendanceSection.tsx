"use client"

import { useEffect, useState } from "react"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import { AttendanceWeekResponse } from "@/types/project"
import { EmptyState, Section, Skeleton, Surface } from "@/components/ui"

function formatMD(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
}

function RateBar({ rate, label }: { rate: number | null; label: string }) {
    if (rate === null) return <p className="text-caption text-ink-2">목표 횟수를 정하면 달성률이 보여요.</p>
    const pct = Math.min(rate * 100, 100)
    return (
        <div className="flex items-center gap-3">
            <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline"
                role="meter"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct)}
            >
                <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-right text-body-sm font-bold tabular-nums text-ink">{Math.round(pct)}%</span>
        </div>
    )
}

export default function AttendanceSection() {
    const [weeks, setWeeks] = useState<AttendanceWeekResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        workoutApiClient
            .getAttendance()
            .then(setWeeks)
            .catch(() => setWeeks([]))
            .finally(() => setLoading(false))
    }, [])

    return (
        <Section title="최근 4주 출석">
            {loading ? (
                <Surface className="flex flex-col gap-4" aria-busy="true">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                    ))}
                </Surface>
            ) : weeks.length === 0 ? (
                <Surface>
                    <EmptyState title="아직 출석 기록이 없어요" body="운동을 마치면 주마다 몇 번 나왔는지 여기에 쌓여요." />
                </Surface>
            ) : (
                <Surface className="flex flex-col gap-4">
                    {weeks.map((w) => {
                        const range = `${formatMD(w.weekStart)} – ${formatMD(w.weekEnd)}`
                        return (
                            <div key={w.weekStart} className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-body-sm tabular-nums text-ink-2">{range}</span>
                                    <span className="text-body-sm font-medium tabular-nums text-ink">
                                        {w.actualDays}
                                        {w.targetDays != null ? `/${w.targetDays}일` : "일"}
                                    </span>
                                </div>
                                <RateBar rate={w.rate} label={`${range} 출석 달성률`} />
                            </div>
                        )
                    })}
                </Surface>
            )}
        </Section>
    )
}
