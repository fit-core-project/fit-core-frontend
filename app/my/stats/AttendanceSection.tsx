"use client"

import { useEffect, useState } from "react"
import { CalendarCheck } from "lucide-react"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import { AttendanceWeekResponse } from "@/types/project"

function formatMD(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
}

function RateBar({ rate }: { rate: number | null }) {
    if (rate === null) return <div className="text-xs text-slate-400">목표 미설정</div>
    const pct = Math.min(rate * 100, 100)
    const color = pct >= 100 ? "bg-blue-500" : pct >= 60 ? "bg-emerald-400" : "bg-slate-300"
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-9 text-right text-xs font-semibold text-slate-600">
                {Math.round(pct)}%
            </span>
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

    if (loading) {
        return (
            <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-4 h-5 w-28 animate-pulse rounded bg-slate-200" />
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="mb-3 h-8 animate-pulse rounded bg-slate-100" />
                ))}
            </div>
        )
    }

    return (
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <CalendarCheck size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-800">최근 4주 출석률</h3>
            </div>

            {weeks.length === 0 ? (
                <p className="text-center text-sm text-slate-400">아직 기록된 운동이 없습니다.</p>
            ) : (
                <div className="space-y-3">
                    {weeks.map((w) => (
                        <div key={w.weekStart}>
                            <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    {formatMD(w.weekStart)} – {formatMD(w.weekEnd)}
                                </span>
                                <span className="text-xs text-slate-600">
                                    {w.actualDays}
                                    {w.targetDays != null ? `/${w.targetDays}일` : "일"}
                                </span>
                            </div>
                            <RateBar rate={w.rate} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
